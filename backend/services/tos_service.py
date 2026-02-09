"""OSS对象存储服务（中台通用上传接口）"""
import mimetypes
from typing import Dict, Any
import httpx
from config import settings


class OSSService:
    """公司中台 OSS 通用上传服务"""

    def __init__(self):
        self.base_url = settings.oss_base_url.rstrip("/")
        self.upload_path = settings.oss_upload_path
        self.upload_type = settings.oss_upload_type
        self.timeout = settings.oss_timeout

    def _guess_content_type(self, filename: str, fallback: str) -> str:
        guessed, _ = mimetypes.guess_type(filename)
        return guessed or fallback or "application/octet-stream"

    async def upload_file(self, file_content: bytes, object_key: str, content_type: str = "image/jpeg") -> str:
        """上传文件到 OSS 并返回可访问 URL"""
        filename = object_key.split("/")[-1] if object_key else "upload.bin"
        resolved_content_type = self._guess_content_type(filename, content_type)

        url = f"{self.base_url}{self.upload_path}"
        data = {"type": self.upload_type}
        files = {"file": (filename, file_content, resolved_content_type)}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, data=data, files=files)

        if response.status_code != 200:
            raise Exception(f"OSS upload failed: {response.status_code} {response.text}")

        try:
            result: Dict[str, Any] = response.json()
        except Exception:
            raise Exception(f"OSS upload failed: invalid JSON response: {response.text}")

        code = result.get("code")
        success = result.get("success")
        if not (code == 0 or code == "0" or success is True):
            raise Exception(f"OSS upload failed: {result.get('msg') or result}")

        data_obj = result.get("data") or {}
        url = data_obj.get("url")
        if not url:
            raise Exception(f"OSS upload failed: missing url in response: {result}")

        return url

    async def delete_files(self, object_keys: list) -> Dict[str, Any]:
        """当前中台 OSS 接口未提供批量删除，直接跳过"""
        return {"message": "OSS delete not supported", "skipped": True, "count": len(object_keys or [])}


# 单例（保持原导出名，避免改动其他模块）
tos_service = OSSService()
