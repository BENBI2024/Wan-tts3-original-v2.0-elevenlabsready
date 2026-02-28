@echo off
echo ====================================
echo Start Digital Human Backend
echo ====================================

cd /d "%~dp0"

REM Check virtual environment
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Check .env file
if not exist ".env" (
    echo Creating .env from template...
    copy .env.example .env
    echo Please edit .env and restart.
    pause
    exit /b 1
)

echo.
echo Starting backend service...
echo Backend API: http://localhost:8013
echo API Docs:   http://localhost:8013/docs
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8013 --reload

pause
