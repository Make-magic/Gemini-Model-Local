@echo off
echo 正在启动应用程序...

REM 启动 dark-server.exe
start "dark-server" "%~dp0dark-server.exe"

REM 打开网页
start "" "https://aistudio.google.com/app/apps/drive/15qFTgY_zBT3PBw-U1X33p5Y7xeTH7_tO?showAssistant=true&showPreview=true&fullscreenApplet=true"

echo 所有应用程序已启动完成