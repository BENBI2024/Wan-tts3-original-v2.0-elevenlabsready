@echo off
echo Starting Backend Setup...
cd /d "%~dp0backend"
start cmd /k setup_backend.bat
timeout /t 2 /nobreak >nul

echo Starting Frontend...
cd /d "%~dp0unified-suite-hub-9c4bfef3-main"
start cmd /k npm run dev

echo.
echo Both services are starting in separate windows.
echo Please wait for them to complete startup.
pause
