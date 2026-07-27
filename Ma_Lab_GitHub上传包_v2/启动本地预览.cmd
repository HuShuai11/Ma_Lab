@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo 正在准备本地预览环境，请稍候…
  call npm install
  if errorlevel 1 (
    echo 准备失败。请确认已经安装 Node.js 22 或更高版本。
    pause
    exit /b 1
  )
)
call npm run dev
pause
