"""LLM服务 - 脚本生成 (支持OpenAI兼容API)"""
import json
import logging
import re
from typing import Any, Dict, List, Optional

import httpx

from config import settings
from errors import AppError

logger = logging.getLogger(__name__)


class LLMService:
    """LLM服务 - 使用OpenAI兼容API生成脚本 (支持147平台等)"""
    
    def __init__(self):
        self.base_url = settings.openai_base_url.rstrip('/')
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
    
    async def _chat_completion(self, messages: list, max_tokens: int = 1500) -> str:
        """调用Chat Completion API (OpenAI兼容格式)"""
        request_body = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7
        }
        
        url = f"{self.base_url}/chat/completions"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers=self._get_headers(),
                json=request_body
            )
            
            if response.status_code != 200:
                raise Exception(f"LLM API error: {response.status_code} {response.text}")
            
            result = response.json()
            message_content = result["choices"][0]["message"]["content"]
            if isinstance(message_content, list):
                text_parts: List[str] = []
                for item in message_content:
                    if isinstance(item, dict) and item.get("type") == "text":
                        text_parts.append(str(item.get("text", "")))
                return "\n".join(text_parts).strip()
            return str(message_content).strip()

    @staticmethod
    def _must_have_non_empty(value: Optional[str], code: str, message: str) -> str:
        text = (value or "").strip()
        if not text:
            raise AppError(code, message)
        return text
    
    async def generate_voice_script(
        self,
        product_name: str,
        selling_points: str,
        language: str = "zh"
    ) -> str:
        """生成口播文案 - 仅支持中文与英文，长度可变"""

        language_configs = {
            "zh": {
                "name": "普通话",
                "instruction": "使用标准普通话",
                "length_hint": "长度可变，建议 30-140 个汉字"
            },
            "en": {
                "name": "English",
                "instruction": "Use English",
                "length_hint": "Variable length, suggested 20-100 words"
            }
        }

        config = language_configs.get(language, language_configs["zh"])

        if language == "zh":
            prompt = f"""你是一名短视频口播文案撰写专家。请为以下产品/业务生成一段口播文案。

要求：
- {config['instruction']}
- 长度要求：{config['length_hint']}
- 语气专业、自信、真实（以工厂企业主的口吻）
- 包含产品/业务名称和核心卖点
- 避免夸张的营销用语
- 直接输出文案内容，不要加任何前缀或解释

产品/业务名称：{product_name}

核心卖点：{selling_points}"""
        else:
            prompt = f"""You are a short-video voice-over copywriter. Generate a voice-over script.

Requirements:
- {config['instruction']}
- Length: {config['length_hint']}
- Tone: professional, confident, authentic (factory owner speaking)
- Include product/business name and core selling points
- Avoid exaggerated marketing claims
- Output the script directly, no JSON format or explanation needed.

Product/Business name: {product_name}

Core selling points: {selling_points}"""

        messages = [{"role": "user", "content": prompt}]
        return await self._chat_completion(messages, max_tokens=500)
    
    async def generate_model_prompt(
        self,
        product_name: str,
        selling_points: str,
        portrait_image_url: str,
        scene_image_urls: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """生成模特图片 prompt 字段（model/relation/env/light），并组装为最终生图 prompt"""
        _ = product_name
        _ = selling_points
        _ = scene_image_urls

        portrait_url = self._must_have_non_empty(
            portrait_image_url,
            "PORTRAIT_IMAGE_REQUIRED",
            "请先上传老板正面照（portrait_image）后再生成脚本。",
        )
        prompt = """【V3】你是一名资深视觉导演 + 纪实摄影分镜策划 + AI 生图提示词专家。
我将提供一张“老板正面照”的参考图。你的目标不是复刻构图，而是最大限度保留人物身份特征（年龄段、性别、肤色、发型发色、脸型轮廓、五官比例、气质、服装风格）。

请按以下要求输出，仅输出 JSON：
1. 生成适合作为数字人视频首帧的纪实正脸素材描述：人物说话时脸部整体必须朝向镜头，可有轻微角度（约0-15度）；身体可轻微侧向站立但头脸不能偏离镜头；双眼清晰可见，五官无遮挡（眼镜除外），避免侧脸/背影/低头/仰头，表情自然（微笑或平静自信）。
2. 风格为工厂纪实摄影 + 手机原生实拍感，保留真实环境光，不要棚拍广告感，不要电影滤镜感。
3. 取景只选工厂一个角落，背景信息够用即可，不追求拍全。
4. 动作设计必须与环境和道具形成可信互动，避免“站桩摆拍”与“硬复制参考照姿态”；动作应自然、克制、可被手机随手拍捕捉，且不引入多余小动作。
5. 人物服装必须与老板参考图一致，不做场景适配改装；眼镜、痣、疤痕等面部标志不可丢失。

输出字段固定为 4 个键：model, relation, env, light
每个值都写成可直接拼接进生图 prompt 的中文短句。
禁止输出任何解释、标题、前后缀。"""

        content_items: List[Dict[str, Any]] = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": portrait_url}},
        ]
        messages = [{"role": "user", "content": content_items}]
        content = await self._chat_completion(messages, max_tokens=1000)

        # 解析 JSON 输出
        data = {}
        raw_content = content.strip()
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError:
            json_match = re.search(r"\{[\s\S]*\}", raw_content)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                except json.JSONDecodeError:
                    data = {}

        if not isinstance(data, dict):
            raise AppError("PROMPT_FIELD_EXTRACTION_FAILED", "图片字段提取失败：模型输出不是 JSON 对象。")

        relation = self._must_have_non_empty(
            data.get("relation"),
            "PROMPT_FIELD_EXTRACTION_FAILED",
            "图片字段提取失败：缺少 relation 字段。",
        )
        env = self._must_have_non_empty(
            data.get("env"),
            "PROMPT_FIELD_EXTRACTION_FAILED",
            "图片字段提取失败：缺少 env 字段。",
        )
        light = self._must_have_non_empty(
            data.get("light"),
            "PROMPT_FIELD_EXTRACTION_FAILED",
            "图片字段提取失败：缺少 light 字段。",
        )
        model = (data.get("model") or "").strip()
        if not model:
            model = self._infer_model_from_relation(relation)
            logger.info("model 字段缺失，已按 relation 自动推断。")

        person_prompt = f"""[Prompt版本]：V3
[场景主题]：写实纪实摄影风格的一张照片，展现一位工厂企业主在自己的生产基地；真实记录感，不摆拍

[人物]：保持与参考图片中人物身份高度一致（核心身份特征不可改变）：
- 保持完全相同的性别、年龄段
- 保持完全相同的脸型、五官比例、面部特征
- 保持完全相同的发型、发色
- 保持完全相同的肤色
- 服装必须与老板参考图保持一致（颜色、款式、层次、配饰不改变）

[人物与互动]：{model}；{relation}；单人入镜；正面胸像或半身像优先；允许轻微不居中；身体可轻微侧向站位，但说话姿态下脸部整体朝向镜头（允许轻微角度，不超过约15度）；人物与现场设备/台面/样品形成自然互动；动作与场景用途一致；避免“站桩摆拍”或生硬姿态；双眼清晰可见；五官无遮挡（眼镜除外）；眼镜/痣/疤痕等面部标志不可丢失；脸部细节清晰、可用于数字人一致性首帧

[环境细节]：{env}；取景只选择参考图中的一个角落/一段背景；背景为清晰可信的工厂实景；避免可读文字与品牌标识；背景轻微虚化但可辨认工业要素

[光影质感]：{light}；有自然明暗对比与轻微阴影；不过曝不死黑；整体白平衡中性偏冷；无电影棚拍光

[拍摄规格]：手机原生实拍质感，真实清晰，人物面部优先清晰；轻微手机成像痕迹即可，避免明显噪点和重压缩感

[融合一致性]：人物必须真实处于场景中，与地面和周边物体存在可信接触关系；脚下或人物与台面接触处有自然接触阴影；人物受光方向、阴影方向、反射色与环境主光一致；人物与背景的透视比例、清晰度层次、景深虚化一致；边缘过渡自然无抠图痕迹；禁止悬浮感、白边/黑边、局部光色突兀不一致

[负面约束]：不要侧脸/背影/低头/仰头；不要多人同框；不要夸张表情；不要文字水印/logo/字幕；不要棚拍广告感；不要过度磨皮；不要背景喧宾夺主；不要改动眼镜与面部标志"""

        action_text = self._get_default_action_text()

        return {
            "person_prompt": person_prompt,
            "action_text": action_text,
            "fields": {
                "model": model,
                "relation": relation,
                "env": env,
                "light": light,
            },
            "raw_response": raw_content,
        }

    @staticmethod
    def _infer_model_from_relation(relation: str) -> str:
        text = (relation or "").strip()
        if not text:
            return "人物自然出镜，与工厂设备或产品形成真实互动"

        parts = re.split(r"[；;。.!?，,]+", text)
        for item in parts:
            candidate = item.strip().strip("：:、，,。;；")
            if candidate:
                return candidate[:80]

        return "人物自然出镜，与工厂设备或产品形成真实互动"

    def _get_default_action_text(self) -> str:
        """默认动作描述"""
        return """基于输入图片中的人物与场景，生成一段超写实手机原生UGC视频。
【人物特征保持】人物为工厂企业主，外貌、脸型、五官比例、发型、肤色、服装与输入图片保持高度一致，不新增或改变人物特征。
【面部动态优化】：人物面对镜头自然说话口播。核心要求：说话时必须有明显的下颌张合动作，带动咬肌和脸颊肌肉自然牵引，杜绝只有嘴唇蠕动。伴随自然的眨眼，眼球表面有灵动的眼神高光，视线随思考有极其细微的闪烁，而非死板凝视。
【视觉与光影】：光线为真实的工厂户外顶光，在人物额头、鼻梁形成写实的高光，眼窝和下巴下方留有深邃的自然阴影，呈现出极强的面部立体感。画面保留真实的皮肤毛孔、细纹和胡茬，禁止任何磨皮滤镜。
【镜头感】：手机手持拍摄，带有呼吸感的轻微抖动和微小的自动对焦调节。色彩呈现手机直出的原始影调，色温中性，画面边缘有轻微的手机镜头光学畸变，看起来就像随手拍下的高保真现场记录。"""
# 单例
llm_service = LLMService()

