"""数字人后端 API - FastAPI 应用"""
import os
import uuid
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from errors import AppError, format_error
from models import (
    AudioGenerationResponse,
    DigitalHumanResult,
    MaterialUploadResponse,
    ScriptGenerationResponse,
    TaskStatus,
    TaskStatusResponse,
)
from task_manager import task_manager

os.makedirs(settings.output_folder_path, exist_ok=True)

app = FastAPI(
    title="数字人生成后端 API",
    description="数字人视频生成服务 API，支持素材上传、脚本生成、MegaTTS3 音频生成和 Infinitetalk 视频生成",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok", "message": "数字人生成后端 API 运行中"}


@app.post("/api/digital-human/upload-materials", response_model=MaterialUploadResponse)
async def upload_materials(
    scene_images: List[UploadFile] = File(default=[], description="场景/工厂图片，最多2张"),
    portrait_image: Optional[UploadFile] = File(default=None, description="人物照片，1张"),
    task_id: Optional[str] = Form(default=None, description="任务ID，不传则创建新任务"),
):
    try:
        if not task_id:
            task_id = task_manager.create_task()
        elif not task_manager.get_task(task_id):
            task_id = task_manager.create_task()

        scene_data = []
        for img in scene_images[:2]:
            content = await img.read()
            scene_data.append((content, img.filename or f"scene_{uuid.uuid4()}.jpg"))

        portrait_data = None
        portrait_filename = "portrait.jpg"
        if portrait_image:
            portrait_data = await portrait_image.read()
            portrait_filename = portrait_image.filename or portrait_filename

        result = await task_manager.upload_materials(
            task_id,
            scene_data,
            portrait_data,
            portrait_filename,
        )

        return MaterialUploadResponse(
            task_id=task_id,
            scene_images=result["scene_images"],
            portrait_image=result["portrait_image"],
            message="素材上传成功",
        )

    except AppError as e:
        raise HTTPException(status_code=400, detail=format_error(e.code, e.message))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/digital-human/generate-script", response_model=ScriptGenerationResponse)
async def generate_script(
    task_id: str = Form(..., description="任务ID"),
    product_name: str = Form(default="", description="介绍主体（可选）"),
    core_selling_points: str = Form(default="", description="核心信息（可选）"),
    language: str = Form(default="zh", description="输出语言: zh/en"),
):
    try:
        task = task_manager.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")

        result = await task_manager.generate_script(
            task_id,
            product_name,
            core_selling_points,
            language,
        )

        return ScriptGenerationResponse(
            task_id=task_id,
            voice_text=result["voice_text"],
            person_prompt=result["person_prompt"],
            action_text=result["action_text"],
            message="脚本生成成功",
        )

    except AppError as e:
        raise HTTPException(status_code=400, detail=format_error(e.code, e.message))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/digital-human/generate-audio", response_model=AudioGenerationResponse)
async def generate_audio(
    task_id: str = Form(..., description="任务ID"),
    language: Optional[str] = Form(default=None, description="可选覆盖任务语言"),
    voice_text: Optional[str] = Form(default=None, description="可选覆盖任务文案，支持前端编辑后提交"),
    reference_audio: Optional[UploadFile] = File(default=None, description="参考音频（必传）"),
):
    """仅使用 MegaTTS3 生成音频。"""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=format_error("TASK_NOT_FOUND", f"任务 {task_id} 不存在"))

    try:
        if reference_audio is None:
            raise AppError("MEGA_TTS3_REFERENCE_AUDIO_REQUIRED", "参考音频为必填项。")

        reference_audio_bytes = None
        reference_audio_filename = "reference.wav"
        reference_audio_bytes = await reference_audio.read()
        reference_audio_filename = reference_audio.filename or reference_audio_filename

        result = await task_manager.generate_audio(
            task_id=task_id,
            language=language,
            voice_text_override=voice_text,
            reference_audio_bytes=reference_audio_bytes,
            reference_audio_filename=reference_audio_filename,
        )

        return AudioGenerationResponse(
            task_id=task_id,
            audio_url=result["audio_url"],
            audio_duration_sec=result["audio_duration_sec"],
            tts_engine_used=result["tts_engine_used"],
            fallback_used=False,
            message="音频生成成功",
        )
    except AppError as e:
        raise HTTPException(status_code=400, detail=format_error(e.code, e.message))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/digital-human/start-generation")
async def start_generation(
    task_id: str = Form(..., description="任务ID"),
    platform: str = Form(default="tiktok", description="目标平台: tiktok/instagram"),
    duration_mode: str = Form(default="follow_audio", description="时长模式: follow_audio/fixed"),
    fixed_duration_sec: Optional[int] = Form(default=None, description="固定时长秒数（仅 fixed 模式有效）"),
):
    try:
        task = task_manager.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")

        await task_manager.start_generation(
            task_id=task_id,
            platform=platform,
            duration_mode=duration_mode,
            fixed_duration_sec=fixed_duration_sec,
        )

        return {
            "task_id": task_id,
            "status": "started",
            "message": "视频生成已启动，请通过 /api/digital-human/status/{task_id} 查询进度",
            "duration_mode": duration_mode,
            "fixed_duration_sec": fixed_duration_sec,
        }

    except AppError as e:
        raise HTTPException(status_code=400, detail=format_error(e.code, e.message))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/digital-human/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")

    result = None
    if task.status in [TaskStatus.AUDIO_READY, TaskStatus.COMPLETED]:
        result = {
            "video_url": task.video_url,
            "audio_url": task.audio_url,
            "model_image_url": task.model_image_url,
            "final_audio_url": task.final_audio_url,
            "audio_duration_sec": task.audio_duration_sec,
            "tts_engine_used": task.tts_engine_used,
            "audio_source": task.audio_source,
            "video_provider": task.video_provider,
            "aspect_ratio_applied": task.aspect_ratio_applied,
            "runninghub_audio_task_id": task.runninghub_audio_task_id,
            "runninghub_video_task_id": task.runninghub_video_task_id,
        }

    return TaskStatusResponse(
        task_id=task_id,
        status=task.status,
        progress=task.progress,
        current_step=task.current_step,
        result=result,
        error=task.error,
        error_code=task.error_code,
    )


@app.get("/api/digital-human/result/{task_id}", response_model=DigitalHumanResult)
async def get_task_result(task_id: str):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")

    return DigitalHumanResult(
        task_id=task_id,
        video_url=task.video_url,
        audio_url=task.audio_url,
        model_image_url=task.model_image_url,
        final_audio_url=task.final_audio_url,
        audio_duration_sec=task.audio_duration_sec,
        tts_engine_used=task.tts_engine_used,
        audio_source=task.audio_source,
        video_provider=task.video_provider,
        status=task.status,
        message=task.current_step,
    )


@app.get("/api/digital-human/debug/{task_id}")
async def get_task_debug(task_id: str):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")

    return {
        "task_id": task_id,
        "status": task.status,
        "progress": task.progress,
        "current_step": task.current_step,
        "error": task.error,
        "error_code": task.error_code,
        "inputs": {
            "scene_images": task.scene_images,
            "portrait_image": task.portrait_image,
            "product_name": task.product_name,
            "core_selling_points": task.core_selling_points,
            "language": task.language.value,
            "script_mode": task.script_mode.value,
            "platform": task.platform.value,
            "duration_mode": task.duration_mode.value,
            "fixed_duration_sec": task.fixed_duration_sec,
            "audio_source": task.audio_source.value,
        },
        "llm_outputs": {
            "voice_text": task.voice_text,
            "person_prompt": task.person_prompt,
            "action_text": task.action_text,
            "image_prompt_fields": task.image_prompt_fields,
            "image_prompt_raw_response": task.image_prompt_raw_response,
            "image_prompt_generated_at": task.image_prompt_generated_at,
        },
        "generation_outputs": {
            "model_image_url": task.model_image_url,
            "seedream_reference_image_url": task.seedream_reference_image_url,
            "audio_url": task.audio_url,
            "final_audio_url": task.final_audio_url,
            "audio_duration_sec": task.audio_duration_sec,
            "tts_engine_used": task.tts_engine_used,
            "video_provider": task.video_provider,
            "comfy_prompt_id": task.comfy_prompt_id,
            "runninghub_audio_task_id": task.runninghub_audio_task_id,
            "runninghub_video_task_id": task.runninghub_video_task_id,
            "aspect_ratio_applied": task.aspect_ratio_applied,
            "video_url": task.video_url,
        },
    }


@app.get("/api/digital-human/task/{task_id}")
async def get_task_detail(task_id: str):
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return task.model_dump()


@app.delete("/api/digital-human/task/{task_id}")
async def delete_task(task_id: str):
    success = task_manager.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")

    return {"message": f"任务 {task_id} 已删除"}


@app.get("/api/config/languages")
async def get_languages():
    return {
        "languages": [
            {"code": "zh", "name": "中文"},
            {"code": "en", "name": "English"},
        ]
    }


@app.get("/api/config/platforms")
async def get_platforms():
    return {
        "platforms": [
            {"code": "tiktok", "name": "TikTok"},
            {"code": "instagram", "name": "Instagram"},
        ]
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8013)

