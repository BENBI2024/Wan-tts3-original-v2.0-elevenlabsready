"""Local workflow runner service (no external ComfyUI HTTP dependency)."""

import asyncio
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import uuid
from typing import Any, Dict, List, Optional

from config import settings
from errors import AppError


class ComfyUIService:
    """Run ComfyUI workflows locally via comfy_runner."""

    def __init__(self) -> None:
        self.timeout_sec = settings.comfyui_timeout_sec
        self._staged_files: Dict[str, bytes] = {}
        self._run_cache: Dict[str, Dict[str, Any]] = {}
        self._runner = None
        self._runner_workdir: Optional[str] = None
        self._torch_runtime_checked = False
        self._cwd_lock = threading.Lock()
        self._backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self._third_party_dir = os.path.join(self._backend_dir, "third_party")
        self._ensure_third_party_path()

    def _ensure_third_party_path(self) -> None:
        """Add backend/third_party to sys.path for comfy_runner imports."""
        if self._third_party_dir not in sys.path:
            sys.path.insert(0, self._third_party_dir)

    def _resolve_comfy_base_path(self) -> str:
        configured = (settings.comfy_base_path or "").strip()
        candidates = []
        if configured:
            candidates.append(configured)
        candidates.append(os.path.join(self._third_party_dir, "ComfyUI"))

        for candidate in candidates:
            abs_candidate = os.path.abspath(candidate)
            if os.path.exists(os.path.join(abs_candidate, "main.py")):
                return abs_candidate

        raise AppError(
            "COMFY_WORKFLOW_ERROR",
            "ComfyUI main.py not found. Please set COMFY_BASE_PATH to a valid ComfyUI directory.",
        )

    def _prepare_runner_workdir(self) -> str:
        """Use comfy_runner package directory as runtime cwd for relative data paths."""
        comfy_runner_dir = os.path.join(self._third_party_dir, "comfy_runner")
        if not os.path.isdir(comfy_runner_dir):
            raise AppError(
                "COMFY_WORKFLOW_ERROR",
                f"comfy_runner directory not found: {comfy_runner_dir}",
            )
        return comfy_runner_dir

    def _verify_torch_runtime(self) -> None:
        if self._torch_runtime_checked:
            return

        try:
            proc = subprocess.run(
                [sys.executable, "-c", "import torch, torchaudio"],
                capture_output=True,
                text=True,
                timeout=30,
            )
        except Exception as e:
            raise AppError(
                "COMFY_WORKFLOW_ERROR",
                f"PyTorch runtime check failed: {e}",
            ) from e

        if proc.returncode != 0:
            err_lines = (proc.stderr or proc.stdout or "").strip().splitlines()
            reason = err_lines[-1] if err_lines else "unknown runtime error"
            raise AppError(
                "COMFY_WORKFLOW_ERROR",
                f"PyTorch runtime unavailable: {reason}",
            )

        self._torch_runtime_checked = True

    def _run_predict(
        self,
        runner: Any,
        workflow_api_path: str,
        input_paths: List[str],
        output_dir: str,
    ) -> Any:
        workdir = self._runner_workdir or self._third_party_dir
        with self._cwd_lock:
            previous_cwd = os.getcwd()
            try:
                os.chdir(workdir)
                return runner.predict(
                    workflow_input=workflow_api_path,
                    file_path_list=input_paths,
                    stop_server_after_completion=settings.comfy_stop_server_after_completion,
                    output_folder=output_dir,
                )
            finally:
                os.chdir(previous_cwd)

    def _get_runner(self):
        """Lazily initialize ComfyRunner."""
        if self._runner is not None:
            return self._runner

        try:
            comfy_base_path = self._resolve_comfy_base_path()
            self._runner_workdir = self._prepare_runner_workdir()

            normalized_base_path = comfy_base_path
            if not normalized_base_path.endswith(("/", "\\")):
                normalized_base_path = normalized_base_path + os.sep

            os.environ["COMFY_BASE_PATH"] = normalized_base_path
            os.environ["COMFY_RUNNER_MODELS_BASE_PATH"] = normalized_base_path
            self._verify_torch_runtime()

            from comfy_runner.inf import ComfyRunner  # type: ignore

            self._runner = ComfyRunner()
            return self._runner
        except AppError:
            raise
        except Exception as e:
            raise AppError(
                "COMFY_WORKFLOW_ERROR",
                f"Local workflow runner init failed: {e}",
            ) from e

    async def load_workflow(self, path: str) -> Dict[str, Any]:
        """Load workflow JSON from disk."""
        try:
            with open(path, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
        except FileNotFoundError as e:
            raise AppError("COMFY_WORKFLOW_ERROR", f"workflow file not found: {path}") from e
        except json.JSONDecodeError as e:
            raise AppError("COMFY_WORKFLOW_ERROR", f"workflow JSON decode failed: {path}") from e

        if not isinstance(data, dict):
            raise AppError("COMFY_WORKFLOW_ERROR", f"workflow root must be an object: {path}")
        return data

    async def upload_image(self, file_bytes: bytes, filename: str) -> str:
        """Stage image input and return staged filename."""
        return self._stage_file(file_bytes, filename)

    async def upload_audio(self, file_bytes: bytes, filename: str) -> str:
        """Stage audio input and return staged filename."""
        return self._stage_file(file_bytes, filename)

    def _stage_file(self, file_bytes: bytes, filename: str) -> str:
        safe_name = os.path.basename(filename or "input.bin")
        staged_name = f"{uuid.uuid4().hex}_{safe_name}"
        self._staged_files[staged_name] = file_bytes
        return staged_name

    def workflow_to_prompt(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """Convert UI workflow JSON (nodes/links) into Comfy API prompt JSON."""
        nodes = workflow.get("nodes") or []
        links = workflow.get("links") or []
        link_by_id = {int(l[0]): l for l in links if isinstance(l, list) and len(l) >= 6}

        prompt: Dict[str, Any] = {}
        for node in nodes:
            node_id = str(node.get("id"))
            class_type = node.get("type")
            if not class_type:
                continue

            raw_inputs = node.get("inputs") or []
            widget_values = node.get("widgets_values", [])

            widget_input_names = [inp.get("name") for inp in raw_inputs if inp.get("widget")]
            widget_map: Dict[str, Any] = {}
            if isinstance(widget_values, list):
                for idx, name in enumerate(widget_input_names):
                    if idx < len(widget_values):
                        widget_map[name] = widget_values[idx]
            elif isinstance(widget_values, dict):
                widget_map = dict(widget_values)

            inputs: Dict[str, Any] = {}
            for inp in raw_inputs:
                name = inp.get("name")
                if not name:
                    continue

                link_id = inp.get("link")
                if isinstance(link_id, int):
                    link = link_by_id.get(link_id)
                    if link:
                        from_node_id = str(link[1])
                        from_output_index = int(link[2])
                        inputs[name] = [from_node_id, from_output_index]
                        continue

                if name in widget_map:
                    inputs[name] = widget_map[name]

            prompt[node_id] = {
                "class_type": class_type,
                "inputs": inputs,
                "_meta": {"title": class_type},
            }

        return prompt

    def _looks_like_api_prompt(self, workflow: Dict[str, Any]) -> bool:
        if "nodes" in workflow:
            return False
        if not workflow:
            return False
        sample_key = next(iter(workflow.keys()))
        sample_value = workflow.get(sample_key)
        return isinstance(sample_key, str) and isinstance(sample_value, dict) and "class_type" in sample_value

    async def queue_prompt(self, workflow: Dict[str, Any], is_api_prompt: bool = False) -> str:
        """Execute workflow locally and cache run outputs by prompt_id."""
        runner = await asyncio.to_thread(self._get_runner)

        if is_api_prompt or self._looks_like_api_prompt(workflow):
            prompt = workflow
        else:
            prompt = self.workflow_to_prompt(workflow)

        if not isinstance(prompt, dict) or not prompt:
            raise AppError("COMFY_WORKFLOW_ERROR", "workflow parse failed: empty/invalid prompt")

        prompt_id = str(uuid.uuid4())
        run_dir = tempfile.mkdtemp(prefix="comfy_local_run_")
        input_paths: List[str] = []
        workflow_api_path = os.path.join(run_dir, "workflow_api.json")
        output_dir = os.path.join(run_dir, "output")
        os.makedirs(output_dir, exist_ok=True)

        try:
            with open(workflow_api_path, "w", encoding="utf-8") as f:
                json.dump(prompt, f, ensure_ascii=False)

            for name, content in self._staged_files.items():
                path = os.path.join(run_dir, name)
                with open(path, "wb") as f:
                    f.write(content)
                input_paths.append(path)

            result = await asyncio.wait_for(
                asyncio.to_thread(self._run_predict, runner, workflow_api_path, input_paths, output_dir),
                timeout=max(30, int(self.timeout_sec)),
            )

            output_files: List[str] = []
            if isinstance(result, dict):
                raw_paths = result.get("file_paths", []) or []
                for item in raw_paths:
                    if isinstance(item, str):
                        output_files.append(item)
                    elif isinstance(item, dict) and item.get("path"):
                        output_files.append(str(item["path"]))

            if not output_files:
                for root, _, files in os.walk(output_dir):
                    for file in files:
                        output_files.append(os.path.join(root, file))

            file_meta_list: List[Dict[str, Any]] = []
            for path in output_files:
                # comfy_runner may return either absolute paths or copied file basenames.
                if os.path.isabs(path):
                    abs_path = os.path.abspath(path)
                else:
                    abs_path = os.path.abspath(os.path.join(output_dir, path))
                if not os.path.exists(abs_path):
                    continue
                file_meta_list.append(
                    {
                        "filename": os.path.basename(abs_path),
                        "subfolder": "",
                        "type": "output",
                        "_abs_path": abs_path,
                    }
                )

            history = {
                "prompt_id": prompt_id,
                "outputs": {
                    "local_runner": {
                        "files": file_meta_list,
                        "text": (result or {}).get("text_output", []) if isinstance(result, dict) else [],
                    }
                },
            }

            self._run_cache[prompt_id] = {
                "history": history,
                "run_dir": run_dir,
            }
            return prompt_id
        except asyncio.TimeoutError as e:
            raise AppError("COMFY_QUEUE_TIMEOUT", "local workflow execution timed out") from e
        except AppError:
            raise
        except Exception as e:
            raise AppError("COMFY_WORKFLOW_ERROR", f"local workflow execution failed: {e}") from e
        finally:
            self._staged_files.clear()

    async def wait_for_history(self, prompt_id: str) -> Dict[str, Any]:
        """Return cached run history by prompt_id."""
        run = self._run_cache.get(prompt_id)
        if not run:
            raise AppError("COMFY_QUEUE_TIMEOUT", f"run result not found, prompt_id={prompt_id}")
        return run["history"]

    def extract_output_files(self, history: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract output file metadata from history structure."""
        outputs = history.get("outputs") or {}
        files: List[Dict[str, Any]] = []
        for _, node_output in outputs.items():
            if not isinstance(node_output, dict):
                continue
            for group, value in node_output.items():
                if not isinstance(value, list):
                    continue
                for item in value:
                    if isinstance(item, dict) and "filename" in item:
                        item_copy = dict(item)
                        item_copy["_group"] = group
                        files.append(item_copy)
        return files

    def pick_first_audio_file(self, files: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Pick the first audio-like file from outputs."""
        for file_meta in files:
            name = str(file_meta.get("filename", "")).lower()
            group = str(file_meta.get("_group", "")).lower()
            if any(ext in name for ext in [".mp3", ".wav", ".flac", ".m4a", ".ogg"]) or "audio" in group:
                return file_meta
        # Local runner may collapse output groups to "files" with generic names.
        if len(files) == 1:
            return files[0]
        return None

    def pick_first_video_file(self, files: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Pick the first video-like file from outputs."""
        for file_meta in files:
            name = str(file_meta.get("filename", "")).lower()
            if any(ext in name for ext in [".mp4", ".mov", ".webm", ".mkv"]):
                return file_meta
        return None

    async def download_file(self, file_meta: Dict[str, Any]) -> bytes:
        """Read output file bytes from local path recorded in metadata."""
        abs_path = file_meta.get("_abs_path")
        if not abs_path:
            raise AppError("COMFY_WORKFLOW_ERROR", f"file metadata missing _abs_path: {file_meta}")
        if not os.path.exists(abs_path):
            raise AppError("COMFY_WORKFLOW_ERROR", f"output file not found: {abs_path}")
        with open(abs_path, "rb") as f:
            return f.read()

    def cleanup_prompt(self, prompt_id: str) -> None:
        """Cleanup temp run directory for a prompt_id."""
        run = self._run_cache.pop(prompt_id, None)
        if not run:
            return
        run_dir = run.get("run_dir")
        if run_dir and os.path.exists(run_dir):
            shutil.rmtree(run_dir, ignore_errors=True)


comfyui_service = ComfyUIService()
