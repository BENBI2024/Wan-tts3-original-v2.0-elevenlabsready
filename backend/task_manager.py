"""任务管理器 - 管理数字人生成任务"""
import asyncio
import uuid
import os
import json
from datetime import datetime
from typing import Dict, Optional
from models import TaskData, TaskStatus, LanguageEnum, PlatformEnum
from services import tos_service, ark_service, llm_service, tts_service
from config import settings


class TaskManager:
    """任务管理器"""
    
    def __init__(self):
        self.tasks: Dict[str, TaskData] = {}
    
    def create_task(self) -> str:
        """创建新任务"""
        task_id = str(uuid.uuid4())
        self.tasks[task_id] = TaskData(task_id=task_id)
        return task_id
    
    def get_task(self, task_id: str) -> Optional[TaskData]:
        """获取任务"""
        return self.tasks.get(task_id)
    
    def update_task(self, task_id: str, **kwargs) -> bool:
        """更新任务"""
        task = self.tasks.get(task_id)
        if not task:
            return False
        for key, value in kwargs.items():
            if hasattr(task, key):
                setattr(task, key, value)
        self._save_intermediate(task_id)
        return True

    def _save_intermediate(self, task_id: str) -> None:
        """保存中间产物到桌面"""
        task = self.tasks.get(task_id)
        if not task:
            return
        desktop = os.path.join(os.path.expanduser("~"), "Desktop", "数字人中间产物")
        os.makedirs(desktop, exist_ok=True)
        payload = task.dict()
        payload["saved_at"] = datetime.now().isoformat()
        file_path = os.path.join(desktop, f"{task_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    
    def delete_task(self, task_id: str) -> bool:
        """删除任务"""
        if task_id in self.tasks:
            del self.tasks[task_id]
            return True
        return False
    
    async def upload_materials(
        self, 
        task_id: str, 
        scene_images: list,  # 最多2张场景图片
        portrait_image: Optional[bytes] = None,
        portrait_filename: str = "portrait.jpg"
    ) -> Dict[str, any]:
        """上传素材到TOS"""
        task = self.get_task(task_id)
        if not task:
            raise Exception(f"Task {task_id} not found")
        
        self.update_task(
            task_id, 
            status=TaskStatus.UPLOADING,
            current_step="上传素材",
            progress=10
        )
        
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            scene_urls = []
            
            # 上传场景图片 (最多2张)
            for i, (content, filename) in enumerate(scene_images[:2]):
                object_key = f"scene_{timestamp}_{task_id}_{i}_{filename}"
                url = await tos_service.upload_file(content, object_key)
                scene_urls.append(url)
            
            # 上传人物照片 (1张)
            portrait_url = None
            if portrait_image:
                object_key = f"portrait_{timestamp}_{task_id}_{portrait_filename}"
                portrait_url = await tos_service.upload_file(portrait_image, object_key)
            
            self.update_task(
                task_id,
                scene_images=scene_urls,
                portrait_image=portrait_url,
                progress=30
            )
            
            return {
                "scene_images": scene_urls,
                "portrait_image": portrait_url
            }
        
        except Exception as e:
            self.update_task(
                task_id,
                status=TaskStatus.FAILED,
                error=str(e)
            )
            raise
    
    async def generate_script(
        self, 
        task_id: str, 
        product_name: str, 
        selling_points: str, 
        language: str = "zh"
    ) -> Dict[str, str]:
        """生成脚本"""
        task = self.get_task(task_id)
        if not task:
            raise Exception(f"Task {task_id} not found")
        
        self.update_task(
            task_id,
            status=TaskStatus.GENERATING_SCRIPT,
            current_step="生成脚本",
            progress=35,
            product_name=product_name,
            core_selling_points=selling_points,
            language=LanguageEnum(language)
        )
        
        try:
            # 生成口播文案
            voice_text = await llm_service.generate_voice_script(
                product_name, 
                selling_points, 
                language
            )
            
            # 生成模特prompt和动作描述
            prompts = await llm_service.generate_model_prompt(
                product_name,
                selling_points
            )
            
            self.update_task(
                task_id,
                voice_text=voice_text,
                person_prompt=prompts["person_prompt"],
                action_text=prompts["action_text"],
                progress=50
            )
            
            return {
                "voice_text": voice_text,
                "person_prompt": prompts["person_prompt"],
                "action_text": prompts["action_text"]
            }
        
        except Exception as e:
            self.update_task(
                task_id,
                status=TaskStatus.FAILED,
                error=str(e)
            )
            raise
    
    async def start_generation(
        self, 
        task_id: str, 
        platform: str = "tiktok"
    ) -> None:
        """开始视频生成流程 (后台任务)"""
        task = self.get_task(task_id)
        if not task:
            raise Exception(f"Task {task_id} not found")
        
        self.update_task(
            task_id,
            platform=PlatformEnum(platform)
        )
        # 中间产物代码：点击“开始生成”就强制落盘一次
        self._save_intermediate(task_id)
        
        # 启动后台生成任务
        asyncio.create_task(self._run_generation(task_id))
    
    async def _run_generation(self, task_id: str) -> None:
        """执行完整的生成流程"""
        task = self.get_task(task_id)
        if not task:
            return
        
        try:
            # Step 1: 生成模特图片
            self.update_task(
                task_id,
                status=TaskStatus.GENERATING_IMAGE,
                current_step="生成模特图片",
                progress=55
            )
            
            # 使用人物照片作为参考
            reference_image = task.portrait_image or (task.scene_images[0] if task.scene_images else None)
            
            model_image_url = await ark_service.generate_image(
                task.person_prompt,
                reference_image
            )
            
            self.update_task(
                task_id,
                model_image_url=model_image_url,
                progress=70
            )
            
            # Step 2: 生成TTS音频 (可选，有些场景直接用视频生成API的内置TTS)
            # 这里我们跳过独立TTS，直接在视频生成中使用
            
            # Step 3: 生成数字人视频
            self.update_task(
                task_id,
                status=TaskStatus.GENERATING_VIDEO,
                current_step="生成数字人视频",
                progress=75
            )
            
            video_task_id = await ark_service.create_video_task(
                model_image_url,
                task.action_text,
                task.voice_text,
                task.language.value
            )
            
            # 等待视频生成完成
            self.update_task(task_id, progress=80)
            
            video_url = await ark_service.wait_for_video(video_task_id)
            
            # 完成
            self.update_task(
                task_id,
                status=TaskStatus.COMPLETED,
                current_step="完成",
                progress=100,
                video_url=video_url
            )
        
        except Exception as e:
            self.update_task(
                task_id,
                status=TaskStatus.FAILED,
                error=str(e)
            )


# 单例
task_manager = TaskManager()
