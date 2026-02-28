"""RunningHub workflow API wrapper."""

import asyncio
import json
import mimetypes
import re
import time
from typing import Any, Dict, List, Optional

import httpx

from config import settings
from errors import AppError


class RunningHubService:
    """Encapsulate RunningHub upload/create/query APIs."""

    RUNNING_CODES = {804, 813}
    FAILED_CODE = 805

    def __init__(self) -> None:
        self.base_url = settings.runninghub_base_url.rstrip("/")
        self.poll_interval_sec = max(1.0, float(settings.runninghub_poll_interval_sec))
        self.upload_timeout_sec = max(10, int(settings.runninghub_upload_timeout_sec))
        self.api_timeout_sec = 120

    def _ensure_api_key(self) -> str:
        api_key = (settings.runninghub_api_key or "").strip()
        if not api_key:
            raise AppError("RUNNINGHUB_CONFIG_ERROR", "RUNNINGHUB_API_KEY 未配置")
        return api_key

    def _headers(self) -> Dict[str, str]:
        api_key = self._ensure_api_key()
        return {
            "Authorization": f"Bearer {api_key}",
        }

    def _resolve_workflow_id(self, workflow_id_or_url: str) -> str:
        raw = (workflow_id_or_url or "").strip()
        if not raw:
            raise AppError("RUNNINGHUB_CONFIG_ERROR", "workflowId 未配置")

        if raw.isdigit():
            return raw

        match = re.search(r"/workflow/(\d+)", raw)
        if match:
            return match.group(1)

        digits = re.findall(r"\d+", raw)
        if digits:
            return digits[-1]

        raise AppError("RUNNINGHUB_CONFIG_ERROR", f"鏃犳硶瑙ｆ瀽 workflowId: {workflow_id_or_url}")

    async def _post_json(self, path: str, payload: Dict[str, Any], timeout_sec: int = 120) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=float(timeout_sec)) as client:
            response = await client.post(url, headers=self._headers(), json=payload)

        if response.status_code != 200:
            raise AppError(
                "RUNNINGHUB_HTTP_ERROR",
                f"RunningHub HTTP {response.status_code}, path={path}, body={response.text[:300]}",
            )

        try:
            body = response.json()
        except ValueError as e:
            raise AppError("RUNNINGHUB_HTTP_ERROR", f"RunningHub 杩斿洖闈濲SON: path={path}") from e

        if not isinstance(body, dict):
            raise AppError("RUNNINGHUB_HTTP_ERROR", f"RunningHub 杩斿洖缁撴瀯寮傚父: path={path}")
        return body

    async def upload_file(self, file_bytes: bytes, filename: str, file_type: str = "input") -> str:
        api_key = self._ensure_api_key()
        safe_name = filename or "input.bin"
        mime = mimetypes.guess_type(safe_name)[0] or "application/octet-stream"
        payload = {"apiKey": api_key, "fileType": file_type}
        files = {"file": (safe_name, file_bytes, mime)}

        url = f"{self.base_url}/task/openapi/upload"
        async with httpx.AsyncClient(timeout=float(self.upload_timeout_sec)) as client:
            response = await client.post(url, headers=self._headers(), data=payload, files=files)

        if response.status_code != 200:
            raise AppError(
                "RUNNINGHUB_UPLOAD_FAILED",
                f"涓婁紶鏂囦欢澶辫触: HTTP {response.status_code}, body={response.text[:300]}",
            )

        try:
            body = response.json()
        except ValueError as e:
            raise AppError("RUNNINGHUB_UPLOAD_FAILED", "涓婁紶鏂囦欢杩斿洖闈濲SON") from e

        if body.get("code") != 0:
            raise AppError(
                "RUNNINGHUB_UPLOAD_FAILED",
                f"涓婁紶鏂囦欢澶辫触: code={body.get('code')}, msg={body.get('msg')}, body={json.dumps(body, ensure_ascii=False)[:400]}",
            )

        file_name = (body.get("data") or {}).get("fileName")
        if not file_name:
            raise AppError("RUNNINGHUB_UPLOAD_FAILED", f"涓婁紶鏂囦欢缂哄皯 fileName: {json.dumps(body, ensure_ascii=False)[:400]}")
        return str(file_name)

    async def create_task(
        self,
        workflow_id_or_url: str,
        node_info_list: List[Dict[str, Any]],
        timeout_sec: int,
    ) -> Dict[str, Any]:
        api_key = self._ensure_api_key()
        workflow_id = self._resolve_workflow_id(workflow_id_or_url)
        payload: Dict[str, Any] = {
            "apiKey": api_key,
            "workflowId": workflow_id,
            "nodeInfoList": node_info_list,
        }

        instance_type = (settings.runninghub_instance_type or "").strip()
        if instance_type:
            payload["instanceType"] = instance_type

        webhook_url = (settings.runninghub_webhook_url or "").strip()
        if webhook_url:
            payload["webhookUrl"] = webhook_url

        if settings.runninghub_use_personal_queue:
            payload["usePersonalQueue"] = True

        body = await self._post_json("/task/openapi/create", payload, timeout_sec=max(timeout_sec, self.api_timeout_sec))
        if body.get("code") != 0:
            raise AppError(
                "RUNNINGHUB_TASK_CREATE_FAILED",
                f"鍒涘缓浠诲姟澶辫触: code={body.get('code')}, msg={body.get('msg')}, body={json.dumps(body, ensure_ascii=False)[:500]}",
            )

        data = body.get("data") or {}
        task_id = data.get("taskId")
        if task_id in (None, ""):
            raise AppError(
                "RUNNINGHUB_TASK_CREATE_FAILED",
                f"鍒涘缓浠诲姟鎴愬姛浣嗘棤 taskId: body={json.dumps(body, ensure_ascii=False)[:500]}",
            )

        prompt_tips = data.get("promptTips")
        if isinstance(prompt_tips, str) and prompt_tips:
            try:
                tips_obj = json.loads(prompt_tips)
                node_errors = tips_obj.get("node_errors", {})
                if isinstance(node_errors, dict) and node_errors:
                    raise AppError(
                        "RUNNINGHUB_PROMPT_INVALID",
                        f"宸ヤ綔娴佽妭鐐规牎楠屽け璐? taskId={task_id}, node_errors={json.dumps(node_errors, ensure_ascii=False)[:500]}",
                    )
            except json.JSONDecodeError:
                # keep raw prompt tips if json parse fails
                pass

        return {
            "task_id": str(task_id),
            "task_status": data.get("taskStatus"),
            "raw": body,
        }

    async def query_outputs(self, task_id: str) -> Dict[str, Any]:
        api_key = self._ensure_api_key()
        payload = {"apiKey": api_key, "taskId": task_id}
        return await self._post_json("/task/openapi/outputs", payload, timeout_sec=self.api_timeout_sec)

    async def wait_for_outputs(self, task_id: str, timeout_sec: int) -> List[Dict[str, Any]]:
        timeout_value = int(timeout_sec)
        deadline = None if timeout_value <= 0 else (time.monotonic() + max(1, timeout_value))

        while True:
            if deadline is not None and time.monotonic() >= deadline:
                raise AppError("RUNNINGHUB_TASK_TIMEOUT", f"任务超时({timeout_sec}s): taskId={task_id}")

            body = await self.query_outputs(task_id)
            code = body.get("code")
            data = body.get("data")

            if code == 0:
                if isinstance(data, list):
                    return [item for item in data if isinstance(item, dict)]
                raise AppError(
                    "RUNNINGHUB_TASK_STATUS_ERROR",
                    f"任务返回成功但 data 结构异常, taskId={task_id}, body={json.dumps(body, ensure_ascii=False)[:500]}",
                )

            if code in self.RUNNING_CODES:
                await asyncio.sleep(self.poll_interval_sec)
                continue

            if code == self.FAILED_CODE:
                failed_reason = data.get("failedReason") if isinstance(data, dict) else None
                if isinstance(failed_reason, dict):
                    node_name = failed_reason.get("node_name")
                    message = failed_reason.get("exception_message")
                    raise AppError(
                        "RUNNINGHUB_TASK_FAILED",
                        f"任务失败, taskId={task_id}, node={node_name}, message={message}",
                    )
                raise AppError(
                    "RUNNINGHUB_TASK_FAILED",
                    f"任务失败, taskId={task_id}, body={json.dumps(body, ensure_ascii=False)[:500]}",
                )

            raise AppError(
                "RUNNINGHUB_TASK_STATUS_ERROR",
                f"未知任务状态, taskId={task_id}, code={code}, msg={body.get('msg')}",
            )
    async def download_file(self, file_url: str, timeout_sec: int = 300) -> bytes:
        async with httpx.AsyncClient(timeout=float(timeout_sec)) as client:
            resp = await client.get(file_url)
        if resp.status_code != 200:
            raise AppError(
                "RUNNINGHUB_DOWNLOAD_FAILED",
                f"涓嬭浇杈撳嚭澶辫触: HTTP {resp.status_code}, url={file_url}",
            )
        return resp.content

    @staticmethod
    def pick_first_audio_output(outputs: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        for output in outputs:
            file_type = str(output.get("fileType", "")).lower()
            file_url = str(output.get("fileUrl", "")).lower()
            if file_type in {"mp3", "wav", "flac", "m4a", "ogg"}:
                return output
            if any(file_url.endswith(ext) for ext in (".mp3", ".wav", ".flac", ".m4a", ".ogg")):
                return output
        return outputs[0] if len(outputs) == 1 else None

    @staticmethod
    def pick_first_video_output(outputs: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        for output in outputs:
            file_type = str(output.get("fileType", "")).lower()
            file_url = str(output.get("fileUrl", "")).lower()
            if file_type in {"mp4", "mov", "webm", "mkv"}:
                return output
            if any(file_url.endswith(ext) for ext in (".mp4", ".mov", ".webm", ".mkv")):
                return output
        return None


runninghub_service = RunningHubService()

