"""BytePlus Ark API 服务 - 图片和视频生成"""
import httpx
import asyncio
from typing import Optional, Dict, Any, List
from config import settings


class ArkService:
    """BytePlus Ark API 服务"""
    
    def __init__(self):
        self.base_url = settings.ark_base_url
        self.api_key = settings.ark_api_key
        self.seedream_model = settings.seedream_model
        self.seedream_size = settings.seedream_size
        self.seedream_watermark = settings.seedream_watermark
        self.seedance_model = settings.seedance_model
        self.seedance_duration = settings.seedance_duration
        self.seedance_camera_fixed = settings.seedance_camera_fixed
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
    
    async def generate_image(
        self,
        prompt: str,
        reference_image_url: Optional[str] = None
    ) -> str:
        """生成图片 (Seedream API)"""

        # 构建提示词，强调参考图片的重要性
        if reference_image_url:
            ref_hint = """【重要】必须严格保持与参考图片中人物完全一致：
- 保持完全相同的性别、年龄段
- 保持完全相同的脸型、五官比例、面部特征
- 保持完全相同的发型、发色
- 保持完全相同的肤色
- 保持完全相同的服装、衣着（颜色、款式、细节都要一致）
请基于参考图片中的真实人物生成图片，不要改变任何外貌和服装特征。"""
            full_prompt = f"{ref_hint}\n\n{prompt}"
        else:
            full_prompt = prompt

        request_body = {
            "model": self.seedream_model,
            "prompt": full_prompt,
            "response_format": "url",
            "size": self.seedream_size,
            "stream": False,
            "watermark": self.seedream_watermark,
        }

        if reference_image_url:
            request_body["image"] = reference_image_url
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/v3/images/generations",
                headers=self._get_headers(),
                json=request_body
            )
            
            if response.status_code != 200:
                raise Exception(f"Image generation failed: {response.status_code} {response.text}")
            
            result = response.json()
            
            # 提取图片URL
            image_url = self._extract_image_url(result)
            if not image_url:
                raise Exception("Failed to extract image URL from response")
            
            return image_url
    
    def _extract_image_url(self, result: Dict) -> Optional[str]:
        """从API响应中提取图片URL"""
        def find_url(value):
            if not value:
                return None
            if isinstance(value, str):
                if value.strip().startswith(('http://', 'https://')):
                    return value.strip()
                return None
            if isinstance(value, list):
                for v in value:
                    url = find_url(v)
                    if url:
                        return url
                return None
            if isinstance(value, dict):
                # 优先检查常见字段
                for key in ['url', 'image_url', 'imageUrl']:
                    if key in value:
                        url = find_url(value[key])
                        if url:
                            return url
                # 递归检查其他字段
                for v in value.values():
                    url = find_url(v)
                    if url:
                        return url
            return None
        
        if 'data' in result and isinstance(result['data'], list):
            return find_url(result['data'])
        return find_url(result)
    
    async def create_video_task(
        self, 
        image_url: str, 
        prompt: str, 
        voice_text: str = "",
        language: str = "zh"
    ) -> str:
        """创建视频生成任务 (Seedance API)，返回任务ID"""
        
        # 构建完整的提示词
        full_prompt = prompt
        if voice_text:
            voiceover_lines = [
                "[VOICEOVER]",
                f"Language: {language}",
                f"Text: {voice_text}",
            ]
            if language.startswith("zh"):
                voiceover_lines.append("Speech rate: 1.2x (slightly faster than normal)")
            voiceover_lines.append("Please generate voice audio for the above text and keep lip-sync natural.")
            full_prompt += "\n\n" + "\n".join(voiceover_lines)
        
        duration = 12
        text = f"{full_prompt} --duration {duration} --camerafixed {'true' if self.seedance_camera_fixed else 'false'}"
        
        request_body = {
            "model": self.seedance_model,
            "generate_audio": True,
            "content": [
                {"type": "text", "text": text},
                {"type": "image_url", "image_url": {"url": image_url}}
            ],
            "duration": duration
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/v3/contents/generations/tasks",
                headers=self._get_headers(),
                json=request_body
            )
            
            if response.status_code != 200:
                raise Exception(f"Video task creation failed: {response.status_code} {response.text}")
            
            result = response.json()
            
            # 提取任务ID
            task_id = result.get('id') or result.get('task_id') or \
                      result.get('data', {}).get('id') or result.get('data', {}).get('task_id')
            
            if not task_id:
                raise Exception("Failed to extract task_id from response")
            
            return task_id
    
    async def query_video_task(self, task_id: str) -> Dict[str, Any]:
        """查询视频生成任务状态"""
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{self.base_url}/api/v3/contents/generations/tasks/{task_id}",
                headers=self._get_headers()
            )
            
            if response.status_code != 200:
                raise Exception(f"Video task query failed: {response.status_code} {response.text}")
            
            return response.json()
    
    def parse_video_result(self, result: Dict) -> Dict[str, Any]:
        """解析视频生成结果"""
        raw_status = result.get('status') or result.get('data', {}).get('status') or \
                     result.get('state') or result.get('data', {}).get('state') or \
                     result.get('phase', '')
        
        status = str(raw_status).lower()
        if status in ['done', 'succeeded', 'success', 'completed', 'complete', 'finished']:
            status = 'done'
        elif status in ['failed', 'error', 'canceled', 'cancelled']:
            status = 'failed'
        else:
            status = 'running'
        
        if status == 'failed':
            error = result.get('error') or result.get('data', {}).get('error') or {}
            code = error.get('code') or error.get('Code') or result.get('code') or ''
            msg = error.get('message') or error.get('Message') or result.get('message') or ''
            raise Exception(f"Video task failed: {code} {msg}".strip())
        
        video_url = None
        if status == 'done':
            video_url = self._find_video_url(result)
        
        return {
            "status": status,
            "video_url": video_url
        }
    
    def _find_video_url(self, result: Dict, prefer_ext: str = '.mp4') -> Optional[str]:
        """从结果中查找视频URL"""
        def find_url(value):
            if not value:
                return None
            if isinstance(value, str):
                s = value.strip()
                if not s.startswith(('http://', 'https://')):
                    return None
                if prefer_ext and prefer_ext.lower() in s.lower():
                    return s
                return s
            if isinstance(value, list):
                for v in value:
                    url = find_url(v)
                    if url:
                        return url
                return None
            if isinstance(value, dict):
                for key in ['video_url', 'videoUrl', 'url', 'href']:
                    if key in value:
                        url = find_url(value[key])
                        if url:
                            return url
                for v in value.values():
                    url = find_url(v)
                    if url:
                        return url
            return None
        
        return find_url(result)
    
    async def wait_for_video(self, task_id: str, max_wait: int = 300, interval: int = 10) -> str:
        """等待视频生成完成，返回视频URL"""
        elapsed = 0
        
        while elapsed < max_wait:
            result = await self.query_video_task(task_id)
            parsed = self.parse_video_result(result)
            
            if parsed['status'] == 'done' and parsed['video_url']:
                return parsed['video_url']
            elif parsed['status'] == 'failed':
                raise Exception("Video generation failed")
            
            await asyncio.sleep(interval)
            elapsed += interval
        
        raise Exception(f"Video generation timeout after {max_wait} seconds")


# 单例
ark_service = ArkService()
