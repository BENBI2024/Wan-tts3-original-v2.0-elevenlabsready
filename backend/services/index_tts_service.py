"""IndexTTS2 workflow service."""
import os
from typing import Any, Dict, Optional

from config import settings
from errors import AppError
from .comfyui_service import comfyui_service


class IndexTTSService:
    """封装 IndexTTS2 workflow 参数注入和执行。"""

    TEXT_NODE_ID = 4
    EMO_TEXT_NODE_ID = 16
    REFERENCE_AUDIO_NODE_ID = 10
    MAIN_NODE_ID = 14

    async def generate_audio(
        self,
        text: str,
        emo_text: str = "",
        reference_audio_bytes: Optional[bytes] = None,
        reference_audio_filename: str = "reference.mp3",
    ) -> Dict[str, Any]:
        if not text.strip():
            raise AppError("INDEX_TTS_FAILED", "文本为空，无法生成音频")

        workflow = await comfyui_service.load_workflow(settings.indextts2_workflow_path)

        # 可选覆盖参考音频：
        # 1) 显式传入 reference_audio
        # 2) 或配置 index_tts_default_reference_audio_path
        # 否则沿用 workflow 内置参考音频，不再报错。
        uploaded_ref_name: Optional[str] = None
        if reference_audio_bytes is None:
            default_ref = settings.index_tts_default_reference_audio_path
            if default_ref and os.path.exists(default_ref):
                with open(default_ref, "rb") as f:
                    reference_audio_bytes = f.read()
                reference_audio_filename = os.path.basename(default_ref)

        if reference_audio_bytes is not None:
            uploaded_ref_name = await comfyui_service.upload_audio(reference_audio_bytes, reference_audio_filename)

        self._set_prompt_text(workflow, self.TEXT_NODE_ID, text.strip())
        self._set_prompt_text(workflow, self.EMO_TEXT_NODE_ID, emo_text.strip() or "平静自然")
        if uploaded_ref_name:
            self._set_load_audio_filename(workflow, self.REFERENCE_AUDIO_NODE_ID, uploaded_ref_name)

        main_node = self._find_node(workflow, self.MAIN_NODE_ID)
        self._set_widget_value(main_node, "use_emo_text", bool(emo_text.strip()))

        prompt_id = await comfyui_service.queue_prompt(workflow)
        try:
            history = await comfyui_service.wait_for_history(prompt_id)
            files = comfyui_service.extract_output_files(history)
            audio_file = comfyui_service.pick_first_audio_file(files)
            if not audio_file:
                raise AppError("INDEX_TTS_FAILED", f"IndexTTS2 未产出音频文件, prompt_id={prompt_id}")

            audio_bytes = await comfyui_service.download_file(audio_file)
            return {
                "audio_bytes": audio_bytes,
                "audio_filename": audio_file.get("filename", "index_tts_output.mp3"),
                "comfy_prompt_id": prompt_id,
            }
        finally:
            comfyui_service.cleanup_prompt(prompt_id)

    def _find_node(self, workflow: Dict[str, Any], node_id: int) -> Dict[str, Any]:
        for node in workflow.get("nodes") or []:
            if int(node.get("id", -1)) == node_id:
                return node
        raise AppError("COMFY_WORKFLOW_ERROR", f"workflow 缺少节点: {node_id}")

    def _set_prompt_text(self, workflow: Dict[str, Any], node_id: int, text: str) -> None:
        node = self._find_node(workflow, node_id)
        widgets = node.get("widgets_values")
        if isinstance(widgets, list):
            if not widgets:
                widgets.append(text)
            else:
                widgets[0] = text
        else:
            node["widgets_values"] = [text]

    def _set_load_audio_filename(self, workflow: Dict[str, Any], node_id: int, filename: str) -> None:
        node = self._find_node(workflow, node_id)
        widgets = node.get("widgets_values")
        if isinstance(widgets, list):
            if not widgets:
                widgets.append(filename)
            else:
                widgets[0] = filename
        else:
            node["widgets_values"] = [filename]

    def _set_widget_value(self, node: Dict[str, Any], input_name: str, value: Any) -> None:
        inputs = node.get("inputs") or []
        widget_input_names = [inp.get("name") for inp in inputs if inp.get("widget")]
        if input_name not in widget_input_names:
            return

        idx = widget_input_names.index(input_name)
        widgets = node.get("widgets_values")
        if isinstance(widgets, list):
            if idx >= len(widgets):
                widgets.extend([None] * (idx - len(widgets) + 1))
            widgets[idx] = value
        elif isinstance(widgets, dict):
            widgets[input_name] = value
        else:
            node["widgets_values"] = [value]


index_tts_service = IndexTTSService()
