"""MegaTTS3 workflow service via RunningHub."""

import os
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from config import settings
from errors import AppError
from .runninghub_service import runninghub_service


class MegaTTS3Service:
    """Encapsulate MegaTTS3 parameter injection and RunningHub execution."""

    TEXT_NODE_ID = "13"
    REFERENCE_AUDIO_NODE_ID = "28"
    RUN_NODE_ID = "33"

    async def generate_audio(
        self,
        text: str,
        reference_audio_bytes: Optional[bytes] = None,
        reference_audio_filename: str = "reference.wav",
    ) -> Dict[str, Any]:
        final_text = (text or "").strip()
        if not final_text:
            raise AppError("MEGA_TTS3_FAILED", "Text is empty; cannot generate audio.")

        if reference_audio_bytes is None:
            default_ref = (settings.mega_tts_default_reference_audio_path or "").strip()
            if default_ref and os.path.exists(default_ref):
                with open(default_ref, "rb") as f:
                    reference_audio_bytes = f.read()
                reference_audio_filename = os.path.basename(default_ref)

        if reference_audio_bytes is None:
            raise AppError("MEGA_TTS3_REFERENCE_AUDIO_REQUIRED", "参考音频必传，缺少语音克隆样本。")

        uploaded_ref_name = await runninghub_service.upload_file(
            file_bytes=reference_audio_bytes,
            filename=reference_audio_filename,
            file_type="input",
        )

        node_info_list: List[Dict[str, Any]] = [
            {
                "nodeId": self.TEXT_NODE_ID,
                "fieldName": "multi_line_prompt",
                "fieldValue": final_text,
            },
            {
                "nodeId": self.REFERENCE_AUDIO_NODE_ID,
                "fieldName": "audio",
                "fieldValue": uploaded_ref_name,
            },
            {
                "nodeId": self.RUN_NODE_ID,
                "fieldName": "unload_model",
                "fieldValue": False,
            },
        ]

        created = await runninghub_service.create_task(
            workflow_id_or_url=settings.runninghub_audio_workflow_id,
            node_info_list=node_info_list,
            timeout_sec=max(30, int(settings.runninghub_audio_timeout_sec)),
        )
        task_id = created["task_id"]
        wait_timeout_sec = int(settings.runninghub_audio_timeout_sec)
        outputs = await runninghub_service.wait_for_outputs(
            task_id=task_id,
            timeout_sec=wait_timeout_sec if wait_timeout_sec > 0 else 0,
        )

        audio_output = runninghub_service.pick_first_audio_output(outputs)
        if not audio_output:
            raise AppError(
                "MEGA_TTS3_FAILED",
                f"MegaTTS3 produced no audio output, taskId={task_id}, outputs={outputs}",
            )

        file_url = str(audio_output.get("fileUrl") or "").strip()
        if not file_url:
            raise AppError("MEGA_TTS3_FAILED", f"MegaTTS3 output missing fileUrl, taskId={task_id}")

        audio_bytes = await runninghub_service.download_file(file_url)
        parsed = urlparse(file_url)
        audio_filename = os.path.basename(parsed.path) or "mega_tts3_output.flac"
        return {
            "audio_bytes": audio_bytes,
            "audio_filename": audio_filename,
            "comfy_prompt_id": task_id,
            "runninghub_task_id": task_id,
        }


mega_tts3_service = MegaTTS3Service()
