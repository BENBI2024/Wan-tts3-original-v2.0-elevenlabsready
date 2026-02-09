"""配置管理模块"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""
    
    # 火山引擎 TOS 配置
    tos_access_key_id: str = ""
    tos_secret_key: str = ""
    tos_bucket_name: str = "liuxinyu"
    tos_endpoint: str = "tos-cn-beijing.volces.com"
    tos_region: str = "cn-beijing"

    # 公司中台 OSS 通用上传接口
    oss_base_url: str = "http://94.74.101.163:28080"
    oss_upload_path: str = "/common/oss/upload"
    oss_upload_type: str = "avatar"
    oss_timeout: float = 60.0
    
    # BytePlus Ark API 配置
    ark_base_url: str = "https://ark.ap-southeast.bytepluses.com"
    ark_api_key: str = ""
    
    # Seedream 图片生成配置
    seedream_model: str = "seedream-4-0-250828"
    seedream_size: str = "2k"
    seedream_watermark: bool = True
    
    # Seedance 视频生成配置
    seedance_model: str = "seedance-1-5-pro-251215"
    seedance_duration: int = 12
    seedance_camera_fixed: bool = True
    
    # SeedSpeech TTS 配置
    seedspeech_endpoint: str = "https://voice.ap-southeast-1.bytepluses.com/api/v3/tts/unidirectional"
    seedspeech_appid: str = ""
    seedspeech_token: str = ""
    seedspeech_cluster: str = "volcano_tts"
    seedspeech_resource_id: str = "volc.megatts.default"
    seedspeech_speaker_id: str = "S_bRdcP1AR1"
    
    # OpenAI API 配置
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4"
    
    # 服务配置
    output_folder_path: str = "./outputs/"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
