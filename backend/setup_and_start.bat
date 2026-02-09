@echo off
echo ====================================
echo 设置并启动后端服务
echo ====================================

cd /d "%~dp0"

echo.
echo [1/4] 创建虚拟环境...
py -m venv venv
if errorlevel 1 (
    echo 错误: 虚拟环境创建失败
    echo 请确保已安装Python 3.9+
    pause
    exit /b 1
)

echo.
echo [2/4] 激活虚拟环境...
call venv\Scripts\activate.bat

echo.
echo [3/4] 安装依赖包...
pip install -r requirements.txt
if errorlevel 1 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [4/4] 启动FastAPI服务...
echo 后端API地址: http://localhost:8000
echo API文档地址: http://localhost:8000/docs
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
