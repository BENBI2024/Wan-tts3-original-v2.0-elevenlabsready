@echo off
echo ====================================
echo 启动数字人生成后端服务
echo ====================================

cd /d "%~dp0"

REM 检查虚拟环境
if exist "venv\Scripts\activate.bat" (
    echo 激活虚拟环境...
    call venv\Scripts\activate.bat
) else (
    echo 创建虚拟环境...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo 安装依赖...
    pip install -r requirements.txt
)

REM 检查.env文件
if not exist ".env" (
    echo 创建.env配置文件...
    copy .env.example .env
    echo 请编辑 .env 文件配置API密钥后重新运行
    pause
    exit /b 1
)

echo.
echo 启动服务...
echo 后端API地址: http://localhost:8000
echo API文档地址: http://localhost:8000/docs
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
