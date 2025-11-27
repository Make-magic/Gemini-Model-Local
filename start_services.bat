@echo off
chcp 65001 >nul
title 启动服务脚本

echo [1/3] 正在打开 Google AI Studio...
start "" "https://aistudio.google.com/app/apps/drive/15qFTgY_zBT3PBw-U1X33p5Y7xeTH7_tO?showAssistant=true&showPreview=true&fullscreenApplet=true"

:: 等待 3 秒
timeout /t 3 /nobreak >nul

echo [2/3] 正在启动 dark-server.exe...
if exist "dark-server.exe" (
    start "" "dark-server.exe"
) else (
    echo [警告] 未找到 dark-server.exe，尝试直接运行命令...
    start "" "dark-server.exe"
)

:: 等待 2 秒
timeout /t 2 /nobreak >nul

echo [3/3] 正在启动 all-model-chat.exe...
if exist "all-model-chat.exe" (
    start "" "all-model-chat.exe"
) else (
    echo [警告] 未找到 all-model-chat.exe，请确保文件在当前目录下。
    pause
    exit /b
)

echo 所有服务启动请求已发送。
:: 等待 2 秒自动关闭窗口
timeout /t 2 /nobreak >nul
