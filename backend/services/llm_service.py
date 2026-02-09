"""LLM服务 - 脚本生成 (支持OpenAI兼容API)"""
import httpx
from typing import Dict
from config import settings


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
            return result["choices"][0]["message"]["content"].strip()
    
    async def generate_voice_script(
        self,
        product_name: str,
        selling_points: str,
        language: str = "zh"
    ) -> str:
        """生成口播文案 - 支持多语言和方言"""

        # 语言配置映射（字数基于12秒语速计算）
        # 中文口播语速约3字/秒；现要求中文语速提升到1.2倍（约3.6字/秒）
        # 英文约2.5词/秒，日语约4字/秒，韩语约3.5字/秒
        language_configs = {
            "zh": {
                "name": "普通话",
                "instruction": "使用标准普通话",
                "word_count": "严格控制在43-50个汉字（不含标点）"
            },
            "zh-shaanxi": {
                "name": "陕西话",
                "instruction": "使用陕西方言，保留陕西话的特色词汇和语气词（如'咥'、'美得很'、'嘹咋咧'等），但确保能被大部分人理解",
                "word_count": "严格控制在43-50个汉字（不含标点）"
            },
            "zh-sichuan": {
                "name": "四川话",
                "instruction": "使用四川方言，保留四川话的特色词汇和语气词（如'巴适'、'雄起'、'安逸'等），但确保能被大部分人理解",
                "word_count": "严格控制在43-50个汉字（不含标点）"
            },
            "en": {
                "name": "English",
                "instruction": "Use English",
                "word_count": "strictly 25-30 words"
            },
            "ja": {
                "name": "Japanese",
                "instruction": "Use Japanese (日本語)",
                "word_count": "厳密に42-48文字（句読点除く）"
            },
            "ko": {
                "name": "Korean",
                "instruction": "Use Korean (한국어)",
                "word_count": "엄격하게 36-42자（문장부호 제외）"
            },
            "es": {
                "name": "Spanish",
                "instruction": "Use Spanish (Español)",
                "word_count": "estrictamente 25-30 palabras"
            },
            "id": {
                "name": "Indonesian",
                "instruction": "Use Indonesian (Bahasa Indonesia)",
                "word_count": "ketat 25-30 kata"
            }
        }

        config = language_configs.get(language, language_configs["zh"])

        # 判断是否为中文方言
        is_chinese_dialect = language.startswith("zh")

        if is_chinese_dialect:
            prompt = f"""你是一名短视频口播文案撰写专家。请为以下产品/业务生成一段正好12秒的口播文案（中文语速提高到1.2倍）。

要求：
- {config['instruction']}
- 字数要求：{config['word_count']}（这是基于中文语速提高到1.2倍≈3.6字/秒计算的，请严格遵守）
- 语气专业、自信、真实（以工厂企业主的口吻）
- 包含产品/业务名称和核心卖点
- 避免夸张的营销用语
- 直接输出文案内容，不要加任何前缀或解释

产品/业务名称：{product_name}

核心卖点：{selling_points}"""
        else:
            prompt = f"""You are a short-video voice-over copywriter. Generate a voice-over script for exactly 12 seconds.

Requirements:
- {config['instruction']}
- Word count: {config['word_count']} (calculated based on normal speaking rate of ~2.5 words/second, please follow strictly)
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
        scene_image_description: str = ""
    ) -> Dict[str, str]:
        """生成模特图片 prompt 字段（relation/env/light），并组装为最终生图 prompt"""

        prompt = """你是一名资深视觉导演 + 纪实摄影分镜策划 + AI 生图提示词专家。
我将提供一张“老板正面照”的参考图。你的目标不是复刻构图，而是：

1) 将画面重构为“适合作为数字人视频首帧”的纪实正脸素材：人物必须正脸可识别、双眼清晰可见、五官无遮挡（不被头发/口罩/手/帽檐遮挡），避免侧脸/背影/低头/仰头；表情自然克制（微笑或平静自信），不过度摆拍。
2) 以“工厂纪实摄影 + 手机原生UGC随手拍”为最高原则：不要影棚感，不要电影感，不要滤镜感；画面必须有真实厂房环境光带来的自然明暗对比（不是均匀打光），并呈现更偏冷的中国工厂实拍色温。

请按以下步骤思考并只输出 JSON（严禁输出任何解释、标题、前后缀）：
- 取景逻辑（必须体现）：UGC随手拍不会把参考图里的工厂环境“全部拍全”，而是只选取其中一个角落/一段背景作为取景范围；背景信息“够用即可”，不要追求全景完备；构图更像随手一站就拍到的视角。
- 场景延伸：基于你选定的“一个角落”扩展真实工业环境（设备/货架/托盘/质检台/地面划线/指示灯/金属反光等），避免可读文字与品牌标识；背景不抢戏，人物为主。
- 互动设计（必须适配低帧率/不流畅风险）：动作要“极小、慢、少”，避免转头、挥手、抬手示意、走动、身体大幅晃动；只允许眨眼、嘴部随说话轻微运动、极轻微点头一次、微表情变化。
- 光影质感（必须写进 light）：光线来源要像真实厂房（顶灯/窗光混合，可能不均匀）；必须出现自然的明暗对比与轻微阴影（例如脸部一侧略暗、下巴/鼻梁有自然阴影），但不过曝不死黑；白平衡偏冷或中性偏冷（像中国工厂现场手机拍摄），避免暖色滤镜；允许轻微曝光波动、轻微噪点与压缩感。
- 正脸保障（必须写进描述里）：明确“单人入镜、正脸可识别、直视镜头为主、脸部清晰无遮挡”；构图允许轻微不居中（更像随手拍），但不能切掉脸部关键区域。

输出要求：
- 只输出以下 3 个字段，键名必须完全一致：relation / env / light
- 每个字段都写成可直接拼进生图 prompt 的中文短句（不要加引号外的任何内容；不要在字段末尾加句号；不要换行）
- 不要出现“可能/大概/类似”等不确定词；不要出现品牌水印/文字标语"""

        messages = [{"role": "user", "content": prompt}]
        content = await self._chat_completion(messages, max_tokens=1000)

        # 解析 JSON 输出
        import json
        data = {}
        raw_content = content.strip()
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r"\{[\s\S]*\}", raw_content)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                except json.JSONDecodeError:
                    data = {}

        if not isinstance(data, dict):
            data = {}

        relation = data.get("relation", "人物保持基本静止，只有眨眼与极轻微点头一次，嘴部随说话轻微运动")
        env = data.get("env", "真实中国工厂内部一角，设备与货架等工业元素清晰可信，背景不喧宾夺主")
        light = data.get("light", "真实厂房顶灯与窗光混合且不均匀，自然明暗对比与轻微阴影，中性偏冷色温，允许轻微曝光与白平衡漂移")

        person_prompt = f"""[人物]：必须严格保持与参考图片中人物完全一致：
- 保持完全相同的性别、年龄段
- 保持完全相同的脸型、五官比例、面部特征
- 保持完全相同的发型、发色
- 保持完全相同的肤色
- 保持完全相同的服装、衣着（颜色、款式、细节都要一致）

[互动]：{relation}单人入镜；正脸可识别；直视镜头为主（允许短暂自然瞟向设备/样品后回镜头）；双眼清晰可见；五官无遮挡；不过度摆拍；构图允许轻微不居中但不能切掉脸部关键区域；画面用于数字人首帧一致性。

[环境细节]：{env}；取景只选择参考图中的一个角落/一段背景作为拍摄范围（不要全景完备）；背景是清晰可信的工厂实景，信息够用即可；空间纵深自然但不刻意追求“拍全”；避免可读文字与品牌标识；背景轻微虚化但仍能辨认工业要素，避免喧宾夺主

[光影质感]：{light}；必须有自然明暗对比与轻微阴影（脸部一侧略暗、下巴/鼻梁有自然阴影），不过曝、不死黑；整体白平衡中性偏冷/偏冷（中国工厂实拍观感），避免暖色调与滤镜感；允许轻微曝光波动与白平衡漂移；无电影棚拍光

[拍摄规格]：手机原生随手拍质感，真实清晰但不海报级；允许轻微手机锐化/降噪痕迹；允许轻微噪点与压缩感；无滤镜、无电影调色、无暖色胶片感；皮肤保留真实纹理，不出现明显磨皮塑料感

[负面约束]：不要侧脸/背影/低头/仰头/大幅度遮挡脸部；不要多人同框；不要夸张表情；不要眼睛闭合或强反光墨镜；不要漫画/二次元/赛博霓虹/奇幻特效；不要过度磨皮、AI塑料肤质；不要文字水印、logo、字幕；不要棚拍广告感、过度打光、过度精致摆拍；不要暖色滤镜/胶片感；不要均匀平光导致的“影棚感”；不要“把背景拍全”的全景感；不要大幅度动作（转头/挥手/抬手示意/走动）"""

        action_text = self._get_default_action_text()

        return {
            "person_prompt": person_prompt,
            "action_text": action_text
        }

    def _get_default_action_text(self) -> str:
        """默认动作描述"""
        return """基于输入图片中的人物与场景，生成一段约 12 秒的超写实手机原生UGC视频。人物为工厂企业主，外貌、脸型、五官比例、发型、肤色、服装与输入图片保持高度一致，不新增或改变人物特征。人物正面面对镜头，正脸可识别且无遮挡，站在真实工厂环境中，保持自然放松的站姿。镜头像手机随手开拍：稳定为主，允许极轻微手持微抖；允许轻微自动曝光与白平衡漂移、轻微噪点与压缩感；不要电影级干净画面、不要滤镜感。

光线要求：真实厂房环境光（顶灯/窗光混合且不均匀），画面必须有自然的明暗对比与轻微阴影（不是均匀打光的影棚感）；整体色温为中性偏冷/偏冷（中国工厂现场手机拍摄观感），避免暖色调滤镜。

动作要求（为了避免低帧率造成的“假动作/卡顿”）：全程只出现极小自然动作，尽量保持静止。只允许：自然眨眼、嘴部随说话轻微运动、极轻微点头一次、微表情变化；禁止转头、禁止抬手示意、禁止挥手、禁止身体大幅晃动、禁止连贯复杂动作。"""
# 单例
llm_service = LLMService()

