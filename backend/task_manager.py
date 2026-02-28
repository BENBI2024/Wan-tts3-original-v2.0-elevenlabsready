"""Task manager for digital human generation."""
import asyncio
import json
import mimetypes
import os
import tempfile
import uuid
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, Optional

import httpx
from mutagen import File as MutagenFile

from config import settings
from errors import AppError
from models import (
    AudioSourceEnum,
    DurationModeEnum,
    LanguageEnum,
    PlatformEnum,
    ScriptModeEnum,
    TTSEngineEnum,
    TaskData,
    TaskStatus,
)
from services import (
    ark_service,
    mega_tts3_service,
    infinitetalk_service,
    llm_service,
    tos_service,
)


class TaskManager:
    """Manage all task states and orchestration."""

    def __init__(self):
        self.tasks: Dict[str, TaskData] = {}

    @staticmethod
    def _drain_background_task(task: asyncio.Task) -> None:
        """Consume background task exceptions to avoid unhandled warnings."""
        try:
            task.result()
        except BaseException:
            pass

    def create_task(self) -> str:
        task_id = str(uuid.uuid4())
        self.tasks[task_id] = TaskData(task_id=task_id, video_provider=settings.video_provider)
        return task_id

    def get_task(self, task_id: str) -> Optional[TaskData]:
        return self.tasks.get(task_id)

    def update_task(self, task_id: str, **kwargs) -> bool:
        task = self.tasks.get(task_id)
        if not task:
            return False

        for key, value in kwargs.items():
            if hasattr(task, key):
                setattr(task, key, value)
        self._save_intermediate(task_id)
        return True

    def _save_intermediate(self, task_id: str) -> None:
        task = self.tasks.get(task_id)
        if not task:
            return

        desktop = os.path.join(os.path.expanduser("~"), "Desktop", "数字人中间产物")
        os.makedirs(desktop, exist_ok=True)
        payload = task.model_dump()
        payload["saved_at"] = datetime.now().isoformat()
        file_path = os.path.join(desktop, f"{task_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    def delete_task(self, task_id: str) -> bool:
        if task_id in self.tasks:
            del self.tasks[task_id]
            return True
        return False

    def _fail_task(self, task_id: str, code: str, message: str) -> None:
        self.update_task(
            task_id,
            status=TaskStatus.FAILED,
            current_step="失败",
            error=message,
            error_code=code,
        )

    async def _download_binary(self, url: str) -> bytes:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            raise AppError("VIDEO_GENERATION_FAILED", f"下载素材失败: {resp.status_code} {url}")
        return resp.content

    def _audio_duration(self, audio_bytes: bytes, filename: str = "audio.mp3") -> float:
        try:
            suffix = os.path.splitext(filename)[1] or ".mp3"
            temp_path = ""
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp.flush()
                temp_path = tmp.name
            media = MutagenFile(temp_path)
            try:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass
            if media and getattr(media, "info", None) and getattr(media.info, "length", None):
                return round(float(media.info.length), 3)
        except Exception:
            return 0.0
        return 0.0

    async def _upload_audio_bytes(self, task_id: str, audio_bytes: bytes, filename: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = os.path.basename(filename or "audio.mp3")
        object_key = f"audio_{timestamp}_{task_id}_{safe_name}"
        content_type, _ = mimetypes.guess_type(safe_name)
        return await tos_service.upload_file(audio_bytes, object_key, content_type or "audio/mpeg")

    async def _build_seedream_reference_image(
        self,
        task_id: str,
        portrait_url: str,
        scene_url: str,
    ) -> str:
        """Combine portrait + scene into one reference image for Seedream."""
        try:
            from PIL import Image
        except ImportError as e:
            raise AppError(
                "IMAGE_MERGE_DEPENDENCY_MISSING",
                "缺少 Pillow 依赖，无法合成老板图和工厂图参考图。",
            ) from e

        portrait_bytes = await self._download_binary(portrait_url)
        scene_bytes = await self._download_binary(scene_url)

        try:
            with Image.open(BytesIO(portrait_bytes)) as portrait_img, Image.open(BytesIO(scene_bytes)) as scene_img:
                portrait_rgb = portrait_img.convert("RGB")
                scene_rgb = scene_img.convert("RGB")

                target_height = max(720, min(1280, max(portrait_rgb.height, scene_rgb.height)))
                resample = getattr(getattr(Image, "Resampling", Image), "LANCZOS")

                def _resize_keep_height(img):
                    width = max(1, int(img.width * (target_height / img.height)))
                    return img.resize((width, target_height), resample)

                portrait_resized = _resize_keep_height(portrait_rgb)
                scene_resized = _resize_keep_height(scene_rgb)

                merged_width = portrait_resized.width + scene_resized.width
                merged = Image.new("RGB", (merged_width, target_height), (255, 255, 255))
                merged.paste(portrait_resized, (0, 0))
                merged.paste(scene_resized, (portrait_resized.width, 0))

                buffer = BytesIO()
                merged.save(buffer, format="JPEG", quality=92, optimize=True)
                merged_bytes = buffer.getvalue()
        except AppError:
            raise
        except Exception as e:
            raise AppError("REFERENCE_IMAGE_MERGE_FAILED", f"合成老板图和工厂图失败: {e}") from e

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        object_key = f"seedream_ref_{timestamp}_{task_id}.jpg"
        return await tos_service.upload_file(merged_bytes, object_key, "image/jpeg")

    async def upload_materials(
        self,
        task_id: str,
        scene_images: list,
        portrait_image: Optional[bytes] = None,
        portrait_filename: str = "portrait.jpg",
    ) -> Dict[str, Any]:
        task = self.get_task(task_id)
        if not task:
            raise AppError("TASK_NOT_FOUND", f"Task {task_id} not found")

        self.update_task(
            task_id,
            status=TaskStatus.UPLOADING,
            current_step="上传素材",
            progress=10,
            error=None,
            error_code=None,
        )

        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            scene_urls = []

            for i, (content, filename) in enumerate(scene_images[:2]):
                object_key = f"scene_{timestamp}_{task_id}_{i}_{filename}"
                url = await tos_service.upload_file(content, object_key)
                scene_urls.append(url)

            portrait_url = None
            if portrait_image:
                object_key = f"portrait_{timestamp}_{task_id}_{portrait_filename}"
                portrait_url = await tos_service.upload_file(portrait_image, object_key)

            self.update_task(
                task_id,
                scene_images=scene_urls,
                portrait_image=portrait_url,
                progress=30,
                current_step="素材上传完成",
            )

            return {
                "scene_images": scene_urls,
                "portrait_image": portrait_url,
            }

        except AppError:
            raise
        except Exception as e:
            self._fail_task(task_id, "UPLOAD_FAILED", str(e))
            raise

    async def generate_script(
        self,
        task_id: str,
        product_name: str = "",
        selling_points: str = "",
        language: str = "zh",
    ) -> Dict[str, str]:
        task = self.get_task(task_id)
        if not task:
            raise AppError("TASK_NOT_FOUND", f"Task {task_id} not found")

        try:
            language_enum = LanguageEnum(language)
        except Exception as e:
            raise AppError("INVALID_LANGUAGE", f"不支持的语言: {language}") from e

        normalized_product = (product_name or "").strip()
        normalized_points = (selling_points or "").strip()
        if not normalized_product and not normalized_points:
            raise AppError("SCRIPT_INPUT_REQUIRED", "介绍主体和核心信息不能同时为空。")

        self.update_task(
            task_id,
            status=TaskStatus.GENERATING_SCRIPT,
            current_step="生成脚本",
            progress=35,
            product_name=normalized_product,
            core_selling_points=normalized_points,
            language=language_enum,
            script_mode=ScriptModeEnum.LLM,
            error=None,
            error_code=None,
        )

        try:
            voice_text = await llm_service.generate_voice_script(
                normalized_product,
                normalized_points,
                language,
            )
            current_snapshot = self.get_task(task_id) or task

            self.update_task(
                task_id,
                voice_text=voice_text,
                progress=50,
                current_step="脚本生成完成",
            )

            return {
                "voice_text": voice_text,
                "person_prompt": current_snapshot.person_prompt or "",
                "action_text": current_snapshot.action_text or "",
            }

        except AppError:
            raise
        except Exception as e:
            self._fail_task(task_id, "SCRIPT_GENERATION_FAILED", str(e))
            raise

    async def generate_audio(
        self,
        task_id: str,
        language: Optional[str] = None,
        voice_text_override: Optional[str] = None,
        reference_audio_bytes: Optional[bytes] = None,
        reference_audio_filename: str = "reference.wav",
    ) -> Dict[str, Any]:
        """Generate audio using MegaTTS3 only."""
        task = self.get_task(task_id)
        if not task:
            raise AppError("TASK_NOT_FOUND", f"Task {task_id} not found")

        target_language = language or task.language.value
        try:
            language_enum = LanguageEnum(target_language)
        except Exception as e:
            raise AppError("INVALID_LANGUAGE", f"不支持的语言: {target_language}") from e

        if voice_text_override is not None:
            patched_text = voice_text_override.strip()
            if not patched_text:
                raise AppError("MEGA_TTS3_FAILED", "编辑后的脚本文案不能为空。")
            script_mode = task.script_mode
            if script_mode != ScriptModeEnum.LLM:
                script_mode = ScriptModeEnum.MANUAL
            self.update_task(task_id, voice_text=patched_text, script_mode=script_mode)

        refreshed = self.get_task(task_id)
        text = ((refreshed.voice_text if refreshed else task.voice_text) or "").strip()
        if not text:
            raise AppError("MEGA_TTS3_FAILED", "任务尚未生成脚本，无法生成音频")
        if reference_audio_bytes is None:
            raise AppError("MEGA_TTS3_REFERENCE_AUDIO_REQUIRED", "请上传参考音频后再生成音频。")

        self.update_task(
            task_id,
            status=TaskStatus.GENERATING_AUDIO,
            current_step="生成音频",
            progress=60,
            language=language_enum,
            error=None,
            error_code=None,
        )

        try:
            timeout_sec = int(settings.tts_generation_timeout_sec)
            generation_task = asyncio.create_task(
                mega_tts3_service.generate_audio(
                    text=text,
                    reference_audio_bytes=reference_audio_bytes,
                    reference_audio_filename=reference_audio_filename,
                )
            )
            if timeout_sec > 0:
                done, _ = await asyncio.wait({generation_task}, timeout=timeout_sec)
                if generation_task not in done:
                    generation_task.cancel()
                    generation_task.add_done_callback(self._drain_background_task)
                    raise asyncio.TimeoutError()

                result = generation_task.result()
            else:
                result = await generation_task
            audio_bytes = result["audio_bytes"]
            generated_name = result.get("audio_filename", "mega_tts3_output.flac")

            audio_duration = self._audio_duration(audio_bytes, generated_name)
            audio_url = await self._upload_audio_bytes(task_id, audio_bytes, generated_name)

            self.update_task(
                task_id,
                status=TaskStatus.AUDIO_READY,
                current_step="音频就绪",
                progress=72,
                audio_url=audio_url,
                final_audio_url=audio_url,
                audio_duration_sec=audio_duration,
                tts_engine_used=TTSEngineEnum.MEGA_TTS3,
                audio_source=AudioSourceEnum.EXISTING_GENERATED,
                comfy_prompt_id=result.get("comfy_prompt_id"),
                runninghub_audio_task_id=result.get("runninghub_task_id"),
            )

            return {
                "task_id": task_id,
                "audio_url": audio_url,
                "audio_duration_sec": audio_duration,
                "tts_engine_used": TTSEngineEnum.MEGA_TTS3,
                "fallback_used": False,
            }

        except asyncio.TimeoutError as e:
            timeout_error = AppError(
                "MEGA_TTS3_TIMEOUT",
                f"MegaTTS3 超时（>{settings.tts_generation_timeout_sec}s）。如需无限等待，请将 TTS_GENERATION_TIMEOUT_SEC 设为 0。",
            )
            self._fail_task(task_id, timeout_error.code, timeout_error.message)
            raise timeout_error from e
        except AppError as e:
            self._fail_task(task_id, e.code, e.message)
            raise
        except Exception as e:
            wrapped = AppError("MEGA_TTS3_FAILED", str(e))
            self._fail_task(task_id, wrapped.code, wrapped.message)
            raise wrapped from e

    async def start_generation(
        self,
        task_id: str,
        platform: str = "tiktok",
        duration_mode: str = "follow_audio",
        fixed_duration_sec: Optional[int] = None,
    ) -> None:
        task = self.get_task(task_id)
        if not task:
            raise AppError("TASK_NOT_FOUND", f"Task {task_id} not found")

        if not task.voice_text:
            raise AppError("SCRIPT_REQUIRED", "请先生成脚本")
        if not task.final_audio_url:
            raise AppError("AUDIO_REQUIRED", "请先上传参考音频并完成音频生成，再开始视频生成。")

        try:
            platform_enum = PlatformEnum(platform)
        except Exception as e:
            raise AppError("INVALID_REQUEST", "无效的 platform") from e

        try:
            duration_mode_enum = DurationModeEnum(duration_mode)
        except Exception as e:
            raise AppError("INVALID_REQUEST", "无效的 duration_mode，应为 follow_audio 或 fixed") from e

        fixed_sec: Optional[int] = None
        if duration_mode_enum == DurationModeEnum.FIXED:
            if fixed_duration_sec is None:
                raise AppError("INVALID_REQUEST", "固定时长模式下必须提供 fixed_duration_sec")
            fixed_sec = int(fixed_duration_sec)
            if fixed_sec <= 0:
                raise AppError("INVALID_REQUEST", "fixed_duration_sec 必须大于 0")

        self.update_task(
            task_id,
            platform=platform_enum,
            duration_mode=duration_mode_enum,
            fixed_duration_sec=fixed_sec,
            video_provider=settings.video_provider,
            error=None,
            error_code=None,
        )
        self._save_intermediate(task_id)

        asyncio.create_task(self._run_generation(task_id))

    async def _resolve_audio_for_video(self, task: TaskData) -> str:
        if task.final_audio_url:
            return task.final_audio_url

        raise AppError(
            "AUDIO_REQUIRED",
            "请先上传参考音频并完成音频生成，再开始视频生成。",
        )

    async def _run_generation(self, task_id: str) -> None:
        task = self.get_task(task_id)
        if not task:
            return

        try:
            self.update_task(
                task_id,
                status=TaskStatus.GENERATING_IMAGE,
                current_step="生成模特图片",
                progress=55,
            )

            if not task.portrait_image:
                raise AppError("PORTRAIT_IMAGE_REQUIRED", "缺少老板正面照（portrait_image），无法生成首帧图。")
            if not task.scene_images:
                raise AppError("SCENE_IMAGE_REQUIRED", "缺少工厂场景图（scene_images），无法生成首帧图。")
            primary_scene_image = (task.scene_images[0] or "").strip()
            if not primary_scene_image:
                raise AppError("SCENE_IMAGE_REQUIRED", "缺少有效工厂场景图 URL，无法生成首帧图。")

            prompts = await llm_service.generate_model_prompt(
                product_name=task.product_name,
                selling_points=task.core_selling_points,
                portrait_image_url=task.portrait_image,
            )
            self.update_task(
                task_id,
                person_prompt=prompts["person_prompt"],
                action_text=prompts["action_text"],
                image_prompt_fields=prompts.get("fields"),
                image_prompt_raw_response=prompts.get("raw_response"),
                image_prompt_generated_at=datetime.now().isoformat(),
            )

            reference_images = [task.portrait_image]
            reference_images.extend(
                [scene_url.strip() for scene_url in (task.scene_images or []) if (scene_url or "").strip()]
            )
            refreshed_for_image = self.get_task(task_id)
            if not refreshed_for_image:
                raise AppError("TASK_NOT_FOUND", f"Task {task_id} not found")
            model_image_url = await ark_service.generate_image(
                refreshed_for_image.person_prompt,
                reference_images,
                platform=refreshed_for_image.platform,
            )

            self.update_task(
                task_id,
                model_image_url=model_image_url,
                seedream_reference_image_url=reference_images[0],
                progress=70,
            )

            self.update_task(task_id, current_step="准备音频", progress=73)
            refreshed_task = self.get_task(task_id)
            if not refreshed_task:
                raise AppError("TASK_NOT_FOUND", f"Task {task_id} not found")

            final_audio_url = await self._resolve_audio_for_video(refreshed_task)
            refreshed_task = self.get_task(task_id)
            if not refreshed_task:
                raise AppError("TASK_NOT_FOUND", f"Task {task_id} not found")

            self.update_task(
                task_id,
                status=TaskStatus.GENERATING_VIDEO,
                current_step="生成数字人视频",
                progress=80,
                final_audio_url=final_audio_url,
                video_provider=settings.video_provider,
            )

            if not refreshed_task.model_image_url:
                raise AppError("VIDEO_GENERATION_FAILED", "缺少模型图片 URL")

            image_bytes = await self._download_binary(refreshed_task.model_image_url)
            audio_bytes = await self._download_binary(final_audio_url)

            video_result = await infinitetalk_service.generate_video(
                image_bytes=image_bytes,
                image_filename=f"model_{task_id}.jpg",
                audio_bytes=audio_bytes,
                audio_filename=f"audio_{task_id}.mp3",
                prompt_text=refreshed_task.action_text,
                platform=refreshed_task.platform,
                duration_mode=refreshed_task.duration_mode,
                fixed_duration_sec=refreshed_task.fixed_duration_sec or 12,
            )

            video_url = await tos_service.upload_file(
                video_result["video_bytes"],
                f"video_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{task_id}_{video_result['video_filename']}",
                "video/mp4",
            )

            self.update_task(
                task_id,
                status=TaskStatus.COMPLETED,
                current_step="完成",
                progress=100,
                video_url=video_url,
                audio_url=final_audio_url,
                final_audio_url=final_audio_url,
                comfy_prompt_id=video_result.get("comfy_prompt_id"),
                runninghub_video_task_id=video_result.get("runninghub_task_id"),
                aspect_ratio_applied=video_result.get("aspect_ratio_applied"),
                error=None,
                error_code=None,
            )

        except AppError as e:
            self._fail_task(task_id, e.code, e.message)
        except Exception as e:
            self._fail_task(task_id, "VIDEO_GENERATION_FAILED", str(e))


task_manager = TaskManager()
