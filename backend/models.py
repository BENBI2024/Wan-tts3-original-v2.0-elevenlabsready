"""Data models."""
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class LanguageEnum(str, Enum):
    ZH = "zh"
    EN = "en"


class PlatformEnum(str, Enum):
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"


class TaskStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    GENERATING_SCRIPT = "generating_script"
    GENERATING_IMAGE = "generating_image"
    GENERATING_AUDIO = "generating_audio"
    AUDIO_READY = "audio_ready"
    GENERATING_VIDEO = "generating_video"
    COMPLETED = "completed"
    FAILED = "failed"


class TTSEngineEnum(str, Enum):
    MEGA_TTS3 = "mega_tts3"


class DurationModeEnum(str, Enum):
    FOLLOW_AUDIO = "follow_audio"
    FIXED = "fixed"


class AudioSourceEnum(str, Enum):
    AUTO = "auto"
    EXISTING_GENERATED = "existing_generated"


class ScriptModeEnum(str, Enum):
    LLM = "llm"
    MANUAL = "manual"


class MaterialUploadRequest(BaseModel):
    pass


class ScriptGenerationRequest(BaseModel):
    product_name: str = Field(default="", description="介绍主体")
    core_selling_points: str = Field(default="", description="核心信息")
    language: LanguageEnum = Field(default=LanguageEnum.ZH, description="输出语言")


class DigitalHumanRequest(BaseModel):
    task_id: str = Field(..., description="任务ID")
    platform: PlatformEnum = Field(default=PlatformEnum.TIKTOK, description="目标平台")


class StartGenerationRequest(BaseModel):
    task_id: str = Field(..., description="任务ID")


class AudioGenerationResponse(BaseModel):
    task_id: str
    audio_url: str
    audio_duration_sec: float
    tts_engine_used: TTSEngineEnum
    fallback_used: bool = False
    message: str = "音频生成成功"


class MaterialUploadResponse(BaseModel):
    task_id: str
    scene_images: List[str] = []
    portrait_image: Optional[str] = None
    message: str = "素材上传成功"


class ScriptGenerationResponse(BaseModel):
    task_id: str
    voice_text: str
    person_prompt: str
    action_text: str
    message: str = "脚本生成成功"


class TaskStatusResponse(BaseModel):
    task_id: str
    status: TaskStatus
    progress: float = 0
    current_step: str = ""
    result: Optional[dict] = None
    error: Optional[str] = None
    error_code: Optional[str] = None


class DigitalHumanResult(BaseModel):
    task_id: str
    video_url: Optional[str] = None
    audio_url: Optional[str] = None
    model_image_url: Optional[str] = None
    final_audio_url: Optional[str] = None
    audio_duration_sec: Optional[float] = None
    tts_engine_used: Optional[TTSEngineEnum] = None
    audio_source: Optional[AudioSourceEnum] = None
    video_provider: Optional[str] = None
    status: TaskStatus
    message: str = ""


class TaskData(BaseModel):
    task_id: str
    status: TaskStatus = TaskStatus.PENDING
    progress: float = 0
    current_step: str = ""
    error: Optional[str] = None
    error_code: Optional[str] = None

    scene_images: List[str] = []
    portrait_image: Optional[str] = None

    product_name: str = ""
    core_selling_points: str = ""
    language: LanguageEnum = LanguageEnum.ZH
    script_mode: ScriptModeEnum = ScriptModeEnum.MANUAL
    voice_text: str = ""
    person_prompt: str = ""
    action_text: str = ""
    image_prompt_fields: Optional[dict] = None
    image_prompt_raw_response: Optional[str] = None
    image_prompt_generated_at: Optional[str] = None

    platform: PlatformEnum = PlatformEnum.TIKTOK

    tts_engine_used: Optional[TTSEngineEnum] = None
    final_audio_url: Optional[str] = None
    audio_duration_sec: Optional[float] = None
    duration_mode: DurationModeEnum = DurationModeEnum.FOLLOW_AUDIO
    fixed_duration_sec: Optional[int] = None
    audio_source: AudioSourceEnum = AudioSourceEnum.AUTO
    video_provider: str = "infinitetalk"
    comfy_prompt_id: Optional[str] = None
    runninghub_audio_task_id: Optional[str] = None
    runninghub_video_task_id: Optional[str] = None
    aspect_ratio_applied: Optional[str] = None

    model_image_url: Optional[str] = None
    seedream_reference_image_url: Optional[str] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
