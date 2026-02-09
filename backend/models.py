"""数据模型定义"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from enum import Enum


class LanguageEnum(str, Enum):
    """支持的语言 - 包含方言和多种语言"""
    ZH = "zh"  # 普通话
    ZH_SHAANXI = "zh-shaanxi"  # 陕西话
    ZH_SICHUAN = "zh-sichuan"  # 四川话
    EN = "en"  # 英语
    JA = "ja"  # 日语
    KO = "ko"  # 韩语
    ES = "es"  # 西班牙语
    ID = "id"  # 印尼语


class PlatformEnum(str, Enum):
    """目标平台"""
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"


class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "pending"
    UPLOADING = "uploading"
    GENERATING_SCRIPT = "generating_script"
    GENERATING_IMAGE = "generating_image"
    GENERATING_AUDIO = "generating_audio"
    GENERATING_VIDEO = "generating_video"
    COMPLETED = "completed"
    FAILED = "failed"


# ===== 请求模型 =====

class MaterialUploadRequest(BaseModel):
    """素材上传请求 - 步骤1"""
    pass  # 文件通过 multipart/form-data 上传


class ScriptGenerationRequest(BaseModel):
    """脚本生成请求 - 步骤2"""
    product_name: str = Field(..., description="产品/业务名称")
    core_selling_points: str = Field(..., description="核心卖点")
    language: LanguageEnum = Field(default=LanguageEnum.ZH, description="输出语言")


class DigitalHumanRequest(BaseModel):
    """数字人生成完整请求 - 步骤3 (启动生成)"""
    task_id: str = Field(..., description="任务ID")
    platform: PlatformEnum = Field(default=PlatformEnum.TIKTOK, description="目标平台")


class StartGenerationRequest(BaseModel):
    """开始视频生成请求"""
    task_id: str = Field(..., description="任务ID")


# ===== 响应模型 =====

class MaterialUploadResponse(BaseModel):
    """素材上传响应"""
    task_id: str
    scene_images: List[str] = []  # 场景图片URL列表 (支持2张)
    portrait_image: Optional[str] = None  # 人物照片URL (1张)
    message: str = "素材上传成功"


class ScriptGenerationResponse(BaseModel):
    """脚本生成响应"""
    task_id: str
    voice_text: str  # 生成的口播文案
    person_prompt: str  # 模特图片生成prompt
    action_text: str  # 视频动作描述
    message: str = "脚本生成成功"


class TaskStatusResponse(BaseModel):
    """任务状态响应"""
    task_id: str
    status: TaskStatus
    progress: float = 0  # 0-100
    current_step: str = ""
    result: Optional[dict] = None
    error: Optional[str] = None


class DigitalHumanResult(BaseModel):
    """数字人生成结果"""
    task_id: str
    video_url: Optional[str] = None
    audio_url: Optional[str] = None
    model_image_url: Optional[str] = None
    status: TaskStatus
    message: str = ""


# ===== 内部数据模型 =====

class TaskData(BaseModel):
    """任务完整数据"""
    task_id: str
    status: TaskStatus = TaskStatus.PENDING
    progress: float = 0
    current_step: str = ""
    error: Optional[str] = None
    
    # 素材数据
    scene_images: List[str] = []  # 场景图片URL (最多2张)
    portrait_image: Optional[str] = None  # 人物照片URL
    
    # 脚本数据
    product_name: str = ""
    core_selling_points: str = ""
    language: LanguageEnum = LanguageEnum.ZH
    voice_text: str = ""  # 口播文案
    person_prompt: str = ""  # 模特生成prompt
    action_text: str = ""  # 动作描述
    
    # 平台选择
    platform: PlatformEnum = PlatformEnum.TIKTOK
    
    # 生成结果
    model_image_url: Optional[str] = None  # 生成的模特图片
    audio_url: Optional[str] = None  # 生成的音频
    video_url: Optional[str] = None  # 最终视频
