"""Configuration management."""
import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Legacy TOS config (reserved)
    tos_access_key_id: str = ""
    tos_secret_key: str = ""
    tos_bucket_name: str = "liuxinyu"
    tos_endpoint: str = "tos-cn-beijing.volces.com"
    tos_region: str = "cn-beijing"

    # OSS upload API
    oss_base_url: str = "http://94.74.101.163:28080"
    oss_upload_path: str = "/common/oss/upload"
    oss_upload_type: str = "avatar"
    oss_timeout: float = 60.0

    # BytePlus Ark
    ark_base_url: str = "https://ark.ap-southeast.bytepluses.com"
    ark_api_key: str = ""

    # Seedream image generation
    seedream_model: str = "seedream-4-0-250828"
    seedream_size: str = "2k"
    seedream_watermark: bool = True

    # Legacy Seedance config (reserved)
    seedance_model: str = "seedance-1-5-pro-251215"
    seedance_duration: int = 12
    seedance_camera_fixed: bool = True

    # OpenAI
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4"

    # Comfy runner / workflow config
    comfyui_base_url: str = "http://127.0.0.1:8188"
    comfyui_ws_url: str = "ws://127.0.0.1:8188/ws"
    comfyui_timeout_sec: int = 900
    tts_generation_timeout_sec: int = 0
    comfyui_poll_interval_sec: float = 3.0
    comfyui_client_id: str = "digital-human-backend"
    comfy_base_path: str = ""
    comfy_stop_server_after_completion: bool = True
    infinitetalk_workflow_path: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "infinitetalk单人_syncfix_api.json")
    )
    megatts3_workflow_path: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "MegaTTS3单人_api.json")
    )
    mega_tts_default_reference_audio_path: str = ""
    indextts2_workflow_path: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "IndexTTS2单人带情绪 .json")
    )
    index_tts_default_reference_audio_path: str = ""

    # RunningHub workflow API
    runninghub_base_url: str = "https://www.runninghub.cn"
    runninghub_api_key: str = ""
    runninghub_audio_workflow_id: str = "2021124895765172225"
    runninghub_video_workflow_id: str = "2021102605702795266"
    runninghub_poll_interval_sec: float = 5.0
    runninghub_audio_timeout_sec: int = 0
    runninghub_video_timeout_sec: int = 0
    runninghub_upload_timeout_sec: int = 120
    runninghub_instance_type: str = ""
    runninghub_use_personal_queue: bool = False
    runninghub_webhook_url: str = ""

    # 2.0 defaults
    default_duration_mode: str = "follow_audio"
    video_provider: str = "infinitetalk"

    # service
    output_folder_path: str = "./outputs/"


settings = Settings()
