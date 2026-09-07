@echo off
chcp 65001 >nul
echo Arret du serveur USD 4D BIM (port 8000)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>nul
)
echo Termine.
pause
