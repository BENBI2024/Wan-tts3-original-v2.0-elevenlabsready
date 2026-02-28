"""Infinitetalk video service via RunningHub."""

import os
from typing import Any, Dict, List
from urllib.parse import urlparse

from config import settings
from errors import AppError
from models import DurationModeEnum, PlatformEnum
from .runninghub_service import runninghub_service


class InfinitetalkService:
    """Inject runtime inputs into Infinitetalk workflow and execute on RunningHub."""

    IMAGE_NODE_ID = "133"
    AUDIO_NODE_ID = "125"
    PROMPT_NODE_ID = "205"
    MULTITALK_EMBEDS_NODE_ID = "194"
    ASPECT_RATIO_NODE_ID = "204"
    ASPECT_RATIO_FIT_MODE = "crop"
    FPS = 25
    PLATFORM_ASPECT_RATIO_MAP = {
        PlatformEnum.TIKTOK.value: "9:16",
        PlatformEnum.INSTAGRAM.value: "1:1",
    }

    async def generate_video(
        self,
        image_bytes: bytes,
        image_filename: str,
        audio_bytes: bytes,
        audio_filename: str,
        prompt_text: str,
        platform: PlatformEnum = PlatformEnum.TIKTOK,
        duration_mode: DurationModeEnum = DurationModeEnum.FOLLOW_AUDIO,
        fixed_duration_sec: int = 12,
    ) -> Dict[str, Any]:
        uploaded_image_name = await runninghub_service.upload_file(
            file_bytes=image_bytes,
            filename=image_filename,
            file_type="input",
        )
        uploaded_audio_name = await runninghub_service.upload_file(
            file_bytes=audio_bytes,
            filename=audio_filename,
            file_type="input",
        )

        aspect_ratio = self._aspect_ratio_for_platform(platform)
        node_info_list: List[Dict[str, Any]] = [
            {
                "nodeId": self.IMAGE_NODE_ID,
                "fieldName": "image",
                "fieldValue": uploaded_image_name,
            },
            {
                "nodeId": self.AUDIO_NODE_ID,
                "fieldName": "audio",
                "fieldValue": uploaded_audio_name,
            },
            {
                "nodeId": self.PROMPT_NODE_ID,
                "fieldName": "text",
                "fieldValue": (prompt_text or "").strip() or "person speaking naturally",
            },
            {
                "nodeId": self.ASPECT_RATIO_NODE_ID,
                "fieldName": "aspect_ratio",
                "fieldValue": aspect_ratio,
            },
            {
                "nodeId": self.ASPECT_RATIO_NODE_ID,
                "fieldName": "fit",
                "fieldValue": self.ASPECT_RATIO_FIT_MODE,
            },
        ]

        if duration_mode == DurationModeEnum.FIXED:
            node_info_list.append(
                {
                    "nodeId": self.MULTITALK_EMBEDS_NODE_ID,
                    "fieldName": "num_frames",
                    "fieldValue": self._fixed_num_frames(fixed_duration_sec),
                }
            )

        created = await runninghub_service.create_task(
            workflow_id_or_url=settings.runninghub_video_workflow_id,
            node_info_list=node_info_list,
            timeout_sec=max(60, int(settings.runninghub_video_timeout_sec)),
        )
        task_id = created["task_id"]

        outputs = await runninghub_service.wait_for_outputs(
            task_id=task_id,
            timeout_sec=0,
        )
        video_output = runninghub_service.pick_first_video_output(outputs)
        if not video_output:
            raise AppError(
                "VIDEO_GENERATION_FAILED",
                f"Infinitetalk produced no video output, taskId={task_id}, outputs={outputs}",
            )

        file_url = str(video_output.get("fileUrl") or "").strip()
        if not file_url:
            raise AppError("VIDEO_GENERATION_FAILED", f"Infinitetalk output missing fileUrl, taskId={task_id}")

        video_bytes = await runninghub_service.download_file(file_url, timeout_sec=600)
        parsed = urlparse(file_url)
        video_filename = os.path.basename(parsed.path) or "infinitetalk_output.mp4"
        return {
            "video_bytes": video_bytes,
            "video_filename": video_filename,
            "comfy_prompt_id": task_id,
            "runninghub_task_id": task_id,
            "aspect_ratio_applied": aspect_ratio,
        }

    def _fixed_num_frames(self, fixed_duration_sec: int) -> int:
        return max(1, int(fixed_duration_sec or 12)) * self.FPS

    def _aspect_ratio_for_platform(self, platform: PlatformEnum) -> str:
        platform_value = platform.value if isinstance(platform, PlatformEnum) else str(platform).lower()
        mapped = self.PLATFORM_ASPECT_RATIO_MAP.get(platform_value)
        if not mapped:
            raise AppError("INVALID_REQUEST", f"不支持的平台: {platform_value}")
        return mapped


infinitetalk_service = InfinitetalkService()
