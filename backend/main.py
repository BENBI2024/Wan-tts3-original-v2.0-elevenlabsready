"""数字人后端API - FastAPI应用"""
import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config import settings
from models import (
    TaskStatus, LanguageEnum, PlatformEnum,
    MaterialUploadResponse, ScriptGenerationRequest, ScriptGenerationResponse,
    TaskStatusResponse, DigitalHumanResult
)
from task_manager import task_manager

# 确保输出目录存在
os.makedirs(settings.output_folder_path, exist_ok=True)

app = FastAPI(
    title="数字人生成后端 API",
    description="数字人视频生成服务API，支持素材上传、脚本生成、视频生成",
    version="1.0.0"
)

# CORS配置 - 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制为前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== API路由 =====

@app.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "message": "数字人生成后端 API 运行中"}


@app.post("/api/digital-human/upload-materials", response_model=MaterialUploadResponse)
async def upload_materials(
    scene_images: List[UploadFile] = File(default=[], description="场景/工厂图片，最多2张"),
    portrait_image: Optional[UploadFile] = File(default=None, description="人物照片，1张"),
    task_id: Optional[str] = Form(default=None, description="任务ID，不传则创建新任务")
):
    """
    步骤1: 素材上传
    - scene_images: 工厂/场景环境图片，支持上传1-2张
    - portrait_image: 人物正面照，支持上传1张
    """
    try:
        # 创建或获取任务
        if not task_id:
            task_id = task_manager.create_task()
        elif not task_manager.get_task(task_id):
            task_id = task_manager.create_task()
        
        # 读取场景图片
        scene_data = []
        for img in scene_images[:2]:  # 最多2张
            content = await img.read()
            scene_data.append((content, img.filename or f"scene_{uuid.uuid4()}.jpg"))
        
        # 读取人物照片
        portrait_data = None
        portrait_filename = "portrait.jpg"
        if portrait_image:
            portrait_data = await portrait_image.read()
            portrait_filename = portrait_image.filename or portrait_filename
        
        # 上传到TOS
        result = await task_manager.upload_materials(
            task_id,
            scene_data,
            portrait_data,
            portrait_filename
        )
        
        return MaterialUploadResponse(
            task_id=task_id,
            scene_images=result["scene_images"],
            portrait_image=result["portrait_image"],
            message="素材上传成功"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/digital-human/generate-script", response_model=ScriptGenerationResponse)
async def generate_script(
    task_id: str = Form(..., description="任务ID"),
    product_name: str = Form(..., description="产品/业务名称"),
    core_selling_points: str = Form(..., description="核心卖点"),
    language: str = Form(default="zh", description="输出语言: zh/en/ja/ko")
):
    """
    步骤2: 脚本生成
    - product_name: 产品名称
    - core_selling_points: 核心卖点
    - language: 输出语言
    """
    try:
        task = task_manager.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
        
        result = await task_manager.generate_script(
            task_id,
            product_name,
            core_selling_points,
            language
        )
        
        return ScriptGenerationResponse(
            task_id=task_id,
            voice_text=result["voice_text"],
            person_prompt=result["person_prompt"],
            action_text=result["action_text"],
            message="脚本生成成功"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/digital-human/start-generation")
async def start_generation(
    task_id: str = Form(..., description="任务ID"),
    platform: str = Form(default="tiktok", description="目标平台: tiktok/instagram")
):
    """
    步骤3: 开始生成数字人视频
    - platform: 目标平台
    """
    try:
        task = task_manager.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
        
        # 检查是否有足够的数据
        if not task.voice_text:
            raise HTTPException(status_code=400, detail="请先生成脚本")
        
        # 启动后台生成
        await task_manager.start_generation(task_id, platform)
        
        return {
            "task_id": task_id,
            "status": "started",
            "message": "视频生成已启动，请通过 /api/digital-human/status/{task_id} 查询进度"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/digital-human/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    查询任务状态
    """
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    
    result = None
    if task.status == TaskStatus.COMPLETED:
        result = {
            "video_url": task.video_url,
            "audio_url": task.audio_url,
            "model_image_url": task.model_image_url
        }
    
    return TaskStatusResponse(
        task_id=task_id,
        status=task.status,
        progress=task.progress,
        current_step=task.current_step,
        result=result,
        error=task.error
    )


@app.get("/api/digital-human/result/{task_id}", response_model=DigitalHumanResult)
async def get_task_result(task_id: str):
    """
    获取任务结果
    """
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")

    return DigitalHumanResult(
        task_id=task_id,
        video_url=task.video_url,
        audio_url=task.audio_url,
        model_image_url=task.model_image_url,
        status=task.status,
        message=task.current_step
    )


@app.get("/api/digital-human/debug/{task_id}")
async def get_task_debug(task_id: str):
    """
    获取任务的所有中间产物（调试用）
    """
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")

    return {
        "task_id": task_id,
        "status": task.status,
        "progress": task.progress,
        "current_step": task.current_step,
        "error": task.error,

        # 输入素材
        "inputs": {
            "scene_images": task.scene_images,
            "portrait_image": task.portrait_image,
            "product_name": task.product_name,
            "core_selling_points": task.core_selling_points,
            "language": task.language.value,
            "platform": task.platform.value,
        },

        # LLM 生成的中间产物
        "llm_outputs": {
            "voice_text": task.voice_text,
            "person_prompt": task.person_prompt,
            "action_text": task.action_text,
        },

        # 生成结果
        "generation_outputs": {
            "model_image_url": task.model_image_url,
            "audio_url": task.audio_url,
            "video_url": task.video_url,
        }
    }


@app.delete("/api/digital-human/task/{task_id}")
async def delete_task(task_id: str):
    """
    删除任务
    """
    success = task_manager.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    
    return {"message": f"任务 {task_id} 已删除"}


# ===== 辅助API =====

@app.get("/api/config/languages")
async def get_languages():
    """获取支持的语言列表"""
    return {
        "languages": [
            {"code": "zh", "name": "中文"},
            {"code": "en", "name": "English"},
            {"code": "ja", "name": "日本語"},
            {"code": "ko", "name": "한국어"}
        ]
    }


@app.get("/api/config/platforms")
async def get_platforms():
    """获取支持的平台列表"""
    return {
        "platforms": [
            {"code": "tiktok", "name": "TikTok"},
            {"code": "instagram", "name": "Instagram"}
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
