# 数字人生成后端

基于Python FastAPI构建的数字人视频生成后端服务，对应n8n工作流的Python实现。

## 功能特性

- 🖼️ **素材上传**: 支持上传2张场景/工厂图片 + 1张人物照片
- 📝 **脚本生成**: 使用LLM生成口播文案和模特生成提示词
- 🎨 **图片生成**: 调用BytePlus Seedream API生成模特图片
- 🎬 **视频生成**: 调用BytePlus Seedance API生成数字人视频
- 🔊 **语音合成**: 支持BytePlus SeedSpeech TTS
- ☁️ **云存储**: 使用火山引擎TOS存储素材

## 目录结构

```
backend/
├── main.py              # FastAPI主应用
├── config.py            # 配置管理
├── models.py            # 数据模型
├── task_manager.py      # 任务管理器
├── services/            # 服务层
│   ├── tos_service.py   # 火山引擎TOS服务
│   ├── ark_service.py   # BytePlus Ark API服务
│   ├── llm_service.py   # LLM脚本生成服务
│   └── tts_service.py   # TTS语音合成服务
├── requirements.txt     # Python依赖
├── .env.example         # 环境变量模板
└── start.bat            # Windows启动脚本
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
copy .env.example .env
# 编辑 .env 文件，填入API密钥
```

### 3. 启动服务

```bash
# 方式1: 使用启动脚本
start.bat

# 方式2: 手动启动
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 访问API文档

打开浏览器访问: http://localhost:8000/docs

## API接口

### 步骤1: 素材上传
```
POST /api/digital-human/upload-materials
```
- `scene_images`: 场景图片(最多2张)
- `portrait_image`: 人物照片(1张)
- `task_id`: 任务ID(可选)

### 步骤2: 脚本生成
```
POST /api/digital-human/generate-script
```
- `task_id`: 任务ID
- `product_name`: 产品名称
- `core_selling_points`: 核心卖点
- `language`: 输出语言(zh/en/ja/ko)

### 步骤3: 开始生成
```
POST /api/digital-human/start-generation
```
- `task_id`: 任务ID
- `platform`: 目标平台(tiktok/instagram)

### 查询状态
```
GET /api/digital-human/status/{task_id}
```

### 获取结果
```
GET /api/digital-human/result/{task_id}
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| TOS_ACCESS_KEY_ID | 火山引擎AccessKey | - |
| TOS_SECRET_KEY | 火山引擎SecretKey | - |
| TOS_BUCKET_NAME | 存储桶名称 | liuxinyu |
| ARK_BASE_URL | BytePlus API地址 | https://ark.ap-southeast.bytepluses.com |
| ARK_API_KEY | BytePlus API密钥 | - |
| OPENAI_API_KEY | OpenAI API密钥 | - |
| OPENAI_BASE_URL | OpenAI API地址 | https://api.openai.com/v1 |
| OPENAI_MODEL | 使用的模型 | gpt-4 |

## 与前端集成

前端需要配置环境变量:

```env
# 前端 .env
VITE_API_BASE_URL=http://localhost:8000
```

## 工作流程

```
用户上传素材 -> 素材存储到TOS -> 生成脚本(LLM) -> 生成模特图片(Seedream) -> 生成视频(Seedance) -> 返回结果
```

## 注意事项

1. 确保所有API密钥已正确配置
2. 火山引擎TOS需要开通并配置CORS
3. BytePlus API需要有效的订阅
4. 视频生成可能需要几分钟，请耐心等待
