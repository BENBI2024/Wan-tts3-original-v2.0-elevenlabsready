"""TTS语音合成服务 - BytePlus SeedSpeech"""
import httpx
import json
import base64
from typing import Optional
from config import settings


class TTSService:
    """TTS语音合成服务 - BytePlus SeedSpeech"""

    def __init__(self):
        self.endpoint = settings.seedspeech_endpoint
        self.appid = settings.seedspeech_appid
        self.token = settings.seedspeech_token
        self.cluster = settings.seedspeech_cluster
        self.resource_id = settings.seedspeech_resource_id
        self.default_speaker_id = settings.seedspeech_speaker_id

        # 语言到speaker_id的映射 (根据实际可用的speaker配置)
        self.language_speaker_map = {
            "zh": self.default_speaker_id,  # 普通话
            "zh-shaanxi": self.default_speaker_id,  # 陕西话 - 使用普通话speaker
            "zh-sichuan": self.default_speaker_id,  # 四川话 - 使用普通话speaker
            "en": "en_male_1",  # 英语 - 需要根据实际可用speaker调整
            "ja": "ja_male_1",  # 日语 - 需要根据实际可用speaker调整
            "ko": "ko_male_1",  # 韩语 - 需要根据实际可用speaker调整
            "es": "es_male_1",  # 西班牙语 - 需要根据实际可用speaker调整
            "id": "id_male_1",  # 印尼语 - 需要根据实际可用speaker调整
        }

    def _get_speaker_id(self, language: str) -> str:
        """根据语言获取对应的speaker_id"""
        return self.language_speaker_map.get(language, self.default_speaker_id)

    def _get_speed_ratio(self, language: str) -> float:
        """根据语言设置语速倍率"""
        if language.startswith("zh"):
            return 1.2
        return 1.0
    
    async def generate_speech(
        self,
        text: str,
        language: str = "zh",
        encoding: str = "mp3"
    ) -> bytes:
        """生成语音，返回音频二进制数据 - 支持多语言和方言"""

        # 根据语言选择合适的speaker
        speaker_id = self._get_speaker_id(language)
        speed_ratio = self._get_speed_ratio(language)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}",
        }

        request_body = {
            "app": {
                "appid": self.appid,
                "token": self.token,
                "cluster": self.cluster,
            },
            "user": {
                "uid": "digital-human-backend"
            },
            "audio": {
                "voice_type": speaker_id,
                "encoding": encoding,
                "speed_ratio": speed_ratio,
                "volume_ratio": 1.0,
                "pitch_ratio": 1.0,
            },
            "request": {
                "reqid": f"req_{hash(text) % 10000000}",
                "text": text,
                "text_type": "plain",
                "operation": "query",
                "with_frontend": 1,
                "frontend_type": "unitTson",
            }
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.endpoint,
                headers=headers,
                json=request_body
            )

            if response.status_code != 200:
                raise Exception(f"TTS request failed: {response.status_code} {response.text}")

            # 解析流式响应
            audio_data = self._parse_streaming_response(response.text)

            if not audio_data:
                raise Exception("No audio data received from TTS service")

            return audio_data
    
    def _parse_streaming_response(self, response_text: str) -> bytes:
        """解析BytePlus TTS流式响应"""
        buffers = []
        
        # 尝试提取JSON对象
        json_strings = self._extract_json_strings(response_text)
        
        for json_str in json_strings:
            try:
                obj = json.loads(json_str)
                code = obj.get('code')
                
                if code == 0 and 'data' in obj and obj['data']:
                    try:
                        audio_chunk = base64.b64decode(obj['data'])
                        buffers.append(audio_chunk)
                    except Exception:
                        pass
                elif code == 20000000:
                    # 流结束标记
                    break
                elif code and code not in [0, 20000000]:
                    raise Exception(f"TTS error code={code}: {obj.get('message', '')}")
            except json.JSONDecodeError:
                continue
        
        return b''.join(buffers)
    
    def _extract_json_strings(self, text: str) -> list:
        """从文本中提取所有JSON对象"""
        result = []
        depth = 0
        start = -1
        in_str = False
        escape = False
        
        for i, ch in enumerate(text):
            if in_str:
                if escape:
                    escape = False
                elif ch == '\\':
                    escape = True
                elif ch == '"':
                    in_str = False
                continue
            
            if ch == '"':
                in_str = True
                continue
            
            if ch == '{':
                if depth == 0:
                    start = i
                depth += 1
            elif ch == '}':
                if depth > 0:
                    depth -= 1
                if depth == 0 and start != -1:
                    result.append(text[start:i + 1])
                    start = -1
        
        return result


# 单例
tts_service = TTSService()
