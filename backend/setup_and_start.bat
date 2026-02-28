@echo off
echo ====================================
echo Setup and Start Backend
echo ====================================

cd /d "%~dp0"

echo.
echo [1/4] Creating virtual environment...
py -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    echo Please ensure Python 3.9+ is installed
    pause
    exit /b 1
)

echo.
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/4] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [4/4] Starting FastAPI service...
echo Backend API: http://localhost:8013
echo API Docs:   http://localhost:8013/docs
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8013 --reload

pause
