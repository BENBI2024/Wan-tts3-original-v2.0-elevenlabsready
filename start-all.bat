@echo off
echo ====================================
echo 数字人生成 - 全栈启动
echo ====================================

echo.
echo [1] 仅启动后端
echo [2] 仅启动前端
echo [3] 同时启动前后端
echo.

set /p choice="请选择 (1/2/3): "

if "%choice%"=="1" goto backend
if "%choice%"=="2" goto frontend
if "%choice%"=="3" goto both

echo 无效的选择
pause
exit /b 1

:backend
cd /d "%~dp0backend"
call start.bat
goto end

:frontend
cd /d "%~dp0unified-suite-hub-9c4bfef3-main"
echo 启动前端开发服务器...
npm run dev
goto end

:both
echo 启动后端服务...
start cmd /k "cd /d %~dp0backend && call start.bat"

timeout /t 3 /nobreak > nul

echo 启动前端服务...
cd /d "%~dp0unified-suite-hub-9c4bfef3-main"
npm run dev
goto end

:end
pause
