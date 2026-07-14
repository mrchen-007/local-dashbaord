@echo off
chcp 65001 >nul
title 工程项目智能数据中枢 - 启动器
color 0A

echo ========================================
echo   工程项目智能数据中枢 - 一键启动
echo ========================================
echo.

:: 设置项目路径
set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo [1/4] 检查 Python 环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Python 未安装，请先安装 Python 3.8+
    pause
    exit /b 1
)
echo      Python OK

echo [2/4] 检查 Node.js 环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Node.js 未安装，请先安装 Node.js 16+
    pause
    exit /b 1
)
echo      Node.js OK

echo [3/4] 启动 AI 服务（后台）...
start "UIE-Service" /min cmd /c "cd /d "%PROJECT_DIR%python" && python start_uie_service.py"
echo      AI 服务启动中，等待模型加载...

:: 等待 AI 服务就绪
echo      等待 AI 服务就绪（约30秒）...
:wait_loop
timeout /t 5 /nobreak >nul
curl -s http://127.0.0.1:8000/health >nul 2>&1
if errorlevel 1 (
    echo      仍在加载模型...
    goto wait_loop
)
echo      AI 服务就绪！

echo [4/4] 启动桌面应用...
echo.
echo ========================================
echo   启动完成！桌面窗口即将打开
echo   使用完毕后关闭此窗口即可停止所有服务
echo ========================================
echo.

:: 启动 Tauri 应用（前台运行）
call npm run tauri dev

:: 应用关闭后清理
echo.
echo 正在停止 AI 服务...
taskkill /FI "WINDOWTITLE eq UIE-Service*" /F >nul 2>&1
echo 已停止
pause
