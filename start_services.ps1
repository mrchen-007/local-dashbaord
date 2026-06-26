# 启动数据提取服务脚本
# 用于启动 UIE 服务和开发服务器

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  数据提取服务启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Python 是否安装
Write-Host "[1/4] 检查 Python 环境..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  错误: Python 未安装" -ForegroundColor Red
    exit 1
}

# 检查 Node.js 是否安装
Write-Host "[2/4] 检查 Node.js 环境..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  错误: Node.js 未安装" -ForegroundColor Red
    exit 1
}

# 安装 Python 依赖
Write-Host "[3/4] 安装 Python 依赖..." -ForegroundColor Yellow
cd python
pip install -r requirements.txt -q
cd ..

# 启动 UIE 服务（后台运行）
Write-Host "[4/4] 启动 UIE 服务..." -ForegroundColor Yellow
$uieJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    python python/start_uie_service.py --port 8000
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  服务已启动" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "UIE 服务: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "开发服务器: npm run tauri:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止所有服务" -ForegroundColor Yellow
Write-Host ""

# 等待用户中断
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # 停止 UIE 服务
    Stop-Job -Job $uieJob
    Remove-Job -Job $uieJob
    Write-Host "服务已停止" -ForegroundColor Red
}
