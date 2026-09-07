@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================
echo   USD 4D BIM - Installation
echo ============================================
echo.

echo [1/3] Backend Python (venv + dependances)...
cd backend
if not exist ".venv" (
    python -m venv .venv
    if errorlevel 1 (
        echo ERREUR: impossible de creer l'environnement virtuel Python.
        echo Verifiez que Python est installe et accessible via "python".
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
