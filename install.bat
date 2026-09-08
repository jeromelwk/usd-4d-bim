@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================
echo   USD 4D BIM - Installation
echo ============================================
echo.

echo [1/3] Backend Python (venv + dependances)...

rem "python" n'est pas toujours sur le PATH meme quand Python est installe
rem (cas frequent avec l'installeur python.org quand la case "Add to PATH"
rem n'est pas cochee) : on essaie d'abord le lanceur "py" (installe a part et
rem quasi toujours sur le PATH), puis "python", puis "python3".
set "PYTHON_CMD="
py -3 --version >nul 2>&1
if not errorlevel 1 set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD (
    python --version >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=python"
)
if not defined PYTHON_CMD (
    python3 --version >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=python3"
)
if not defined PYTHON_CMD (
    echo ERREUR: Python est introuvable dans le PATH ^("python", "py" et "python3" ne repondent pas^).
    echo.
    echo   - Installez Python 3.10 ou plus recent depuis https://www.python.org/downloads/
    echo     et cochez bien "Add python.exe to PATH" lors de l'installation.
    echo   - Si Python vient d'etre installe, fermez et rouvrez cette fenetre
    echo     ^(ou redemarrez l'ordinateur^) : le PATH n'est pris en compte que
    echo     par les nouvelles fenetres ouvertes apres l'installation.
    pause
    exit /b 1
)

cd backend
if not exist ".venv" (
    %PYTHON_CMD% -m venv .venv
    if errorlevel 1 (
        echo ERREUR: impossible de creer l'environnement virtuel Python.
        pause
        exit /b 1
    )
)
".venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
".venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt
if errorlevel 1 (
    echo ERREUR lors de l'installation des dependances backend.
    pause
    exit /b 1
)
cd ..
echo     OK
echo.

echo [2/3] Frontend (dependances + build)...
cd frontend
call npm install --no-fund --no-audit
if errorlevel 1 (
    echo ERREUR lors de "npm install" dans frontend.
    pause
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo ERREUR lors du build du frontend.
    pause
    exit /b 1
)
cd ..
echo     OK
echo.

echo [3/3] Visualiseur 3D (dependances + build)...
cd viewer
call npm install --no-fund --no-audit
if errorlevel 1 (
    echo ERREUR lors de "npm install" dans viewer.
    pause
    exit /b 1
)
call npm run build
if errorlevel 1 (
    echo ERREUR lors du build du visualiseur 3D.
    pause
    exit /b 1
)
cd ..
echo     OK
echo.

echo ============================================
echo   Installation terminee.
echo   Lancez start.bat pour demarrer l'application.
echo ============================================
pause
