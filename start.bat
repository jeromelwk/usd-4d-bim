@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
    echo Environnement non installe. Lancement de install.bat...
    call install.bat
    if errorlevel 1 exit /b 1
)
if not exist "frontend\dist\index.html" (
    echo Frontend non construit. Lancement de install.bat...
    call install.bat
    if errorlevel 1 exit /b 1
)
if not exist "viewer\dist\index.html" (
    echo Visualiseur 3D non construit. Lancement de install.bat...
    call install.bat
    if errorlevel 1 exit /b 1
)

echo Demarrage du serveur USD 4D BIM sur http://localhost:8000 ...
start "USD 4D BIM - serveur (fermer cette fenetre pour arreter)" cmd /k "%~dp0backend\run_backend.bat"

echo Attente du demarrage du serveur...
set /a attempts=0
:waitloop
set /a attempts+=1
timeout /t 1 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:8000/api/health 2>nul | findstr "200" >nul
if not errorlevel 1 goto ready
if !attempts! geq 30 (
    echo Le serveur met du temps a demarrer, ouverture du navigateur quand meme...
    goto ready
)
goto waitloop

:ready
start "" "http://localhost:8000"
