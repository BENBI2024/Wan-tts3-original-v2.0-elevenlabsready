# 数字人视频生成系统

这是一个完整的数字人视频生成系统，包含Python后端和React前端。

## 项目结构

```
数字人重构/
├── backend/                    # Python后端
│   ├── main.py                 # FastAPI主应用
│   ├── config.py               # 配置管理
│   ├── models.py               # 数据模型
│   ├── task_manager.py         # 任务管理器
│   ├── services/               # 服务层
│   │   ├── tos_service.py      # 火山引擎TOS对象存储
│   │   ├── ark_service.py      # BytePlus Ark API (图片/视频生成)
│   │   ├── llm_service.py      # LLM脚本生成
│   │   └── tts_service.py      # TTS语音合成
│   ├── requirements.txt        # Python依赖
│   ├── .env.example            # 环境变量模板
│   └── start.bat               # 后端启动脚本
│
├── unified-suite-hub-9c4bfef3-main/  # React前端
│   ├── src/
│   │   ├── components/modules/ai-toolbox/
│   │   │   └── DigitalHumanGeneration.tsx  # 数字人生成组件
│   │   └── services/
│   │       └── digitalHumanAPI.ts          # 后端API客户端
│   └── .env                    # 前端环境变量
│
├── 20260130后端完成版.json      # 原n8n工作流
└── start-all.bat               # 全栈启动脚本
```

## 系统工作流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                           数字人生成流程                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  步骤1: 素材上传                                                     │
│  ┌────────────────┐   ┌────────────────┐                           │
│  │ 场景图片 (2张)  │   │ 人物照片 (1张) │                           │
│  └───────┬────────┘   └───────┬────────┘                           │
│          │   上传到火山引擎TOS  │                                    │
│          └─────────┬───────────┘                                    │
│                    ▼                                                │
│  步骤2: 脚本生成                                                     │
│  ┌────────────────────────────────────────┐                         │
│  │ 输入: 产品名称、核心卖点、语言         │                         │
│  │ 输出: 口播文案、模特Prompt、动作描述   │                         │
│  └───────────────────┬────────────────────┘                         │
│                      ▼                                              │
│  步骤3: 视频生成                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐             │
│  │ 生成模特图片│─▶│ 生成TTS音频  │─▶│ 生成数字人视频 │             │
│  │ (Seedream)  │  │ (SeedSpeech) │  │ (Seedance)     │             │
│  └─────────────┘  └──────────────┘  └───────┬────────┘             │
│                                             ▼                       │
│                                      ┌──────────────┐               │
│                                      │  最终视频    │               │
│                                      └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 配置后端

```bash
cd backend
copy .env.example .env
# 编辑 .env 填入API密钥
```

### 2. 启动服务

双击 `start-all.bat` 或手动启动:

```bash
# 启动后端
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload

# 启动前端 (新终端)
cd unified-suite-hub-9c4bfef3-main
npm install
npm run dev
```

### 3. 访问应用

- 前端: http://localhost:5173
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs

## API接口对照

| 前端功能 | 后端接口 |
|----------|----------|
| 素材上传 | POST /api/digital-human/upload-materials |
| 脚本生成 | POST /api/digital-human/generate-script |
| 开始生成 | POST /api/digital-human/start-generation |
| 查询状态 | GET /api/digital-human/status/{task_id} |
| 获取结果 | GET /api/digital-human/result/{task_id} |

## 前端组件说明

### DigitalHumanGeneration.tsx

该组件实现了三步式数字人生成流程:

1. **素材上传** - 支持上传2张场景图片和1张人物照片
2. **脚本生成** - 输入产品名称、核心卖点，生成口播脚本
3. **控制与预览** - 选择目标平台，启动视频生成

## 原n8n工作流对应关系

| n8n节点 | Python模块 |
|---------|-----------|
| 配置字段 | config.py |
| 解析输入字段 | models.py |
| 计算文件上传参数 | services/tos_service.py |
| 上传产品图片 | services/tos_service.py |
| 视频文案生成 | services/llm_service.py |
| prompt生成 | services/llm_service.py |
| 计算生成图片任务参数-模特 | services/ark_service.py |
| 发起生成图片任务请求-模特 | services/ark_service.py |
| 计算生成数字人任务参数 | services/ark_service.py |
| 发起生成数字人任务请求 | services/ark_service.py |
| Assemble SeedSpeech Audio | services/tts_service.py |

## 环境变量

### 后端 (.env)

```env
# 火山引擎TOS
TOS_ACCESS_KEY_ID=xxx
TOS_SECRET_KEY=xxx
TOS_BUCKET_NAME=liuxinyu
TOS_ENDPOINT=tos-cn-beijing.volces.com
TOS_REGION=cn-beijing

# BytePlus Ark API
ARK_BASE_URL=https://ark.ap-southeast.bytepluses.com
ARK_API_KEY=xxx

# OpenAI (用于脚本生成)
OPENAI_API_KEY=xxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
```

### 前端 (.env)

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 注意事项

1. 确保Python 3.9+已安装
2. 确保Node.js 18+已安装
3. 所有API密钥需要有效配置
4. 视频生成可能需要3-5分钟
