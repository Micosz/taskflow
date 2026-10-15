@echo off
cd /d "%~dp0"
echo TaskFlow installs for your account and starts when you sign in to Windows.
TaskFlowWidget.exe --install
if errorlevel 1 pause
