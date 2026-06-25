@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo.
echo   ██╗   ██╗████████╗      ██████╗ ██╗     ██████╗
echo   ╚██╗ ██╔╝╚══██╔══╝      ██╔══██╗██║     ██╔══██╗
echo    ╚████╔╝    ██║         ██║  ██║██║     ██████╔╝
echo     ╚██╔╝     ██║         ██║  ██║██║     ██╔═══╝
echo      ██║      ██║         ██████╔╝███████╗██║
echo      ╚═╝      ╚═╝         ╚═════╝ ╚══════╝╚═╝
echo   Web UI - Video Download System
echo.

:: Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"') do set PY_VER=%%i
echo [OK] Python %PY_VER%

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

echo.

:: Setup backend
echo [1/4] Setting up backend...
cd /d "%SCRIPT_DIR%backend"

if exist "venv\Scripts\activate.bat" (
    echo   Virtual environment exists, checking...
    call venv\Scripts\activate.bat
    python -c "import fastapi" >nul 2>&1
    if !errorlevel! neq 0 (
        echo   Dependencies missing, reinstalling...
        call venv\Scripts\deactivate.bat 2>nul
        rmdir /s /q venv
        python -m venv venv
        call venv\Scripts\activate.bat
        python -m pip install --upgrade pip -q
        pip install -r requirements.txt -q
    )
) else (
    echo   Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    python -m pip install --upgrade pip -q
    pip install -r requirements.txt -q
)
echo   [OK] Backend dependencies ready

:: Setup frontend
echo [2/4] Setting up frontend...
cd /d "%SCRIPT_DIR%frontend"
if not exist "node_modules" (
    echo   Installing npm dependencies...
    call npm install --silent
)
echo   [OK] Frontend dependencies ready

:: Start backend
echo [3/4] Starting backend server...
cd /d "%SCRIPT_DIR%backend"
call venv\Scripts\activate.bat
if not exist "data" mkdir data
if not exist "downloads" mkdir downloads
start "yt-dlp-backend" /b python main.py
echo   [OK] Backend started on http://localhost:8200

:: Wait for backend
echo   Waiting for backend...
timeout /t 3 /nobreak >nul

:: Start frontend
echo [4/4] Starting frontend server...
cd /d "%SCRIPT_DIR%frontend"
start "yt-dlp-frontend" /b cmd /c "npm run dev"
echo   [OK] Frontend started on http://localhost:3200

echo.
echo ════════════════════════════════════════════════════════
echo   System is running!
echo   Frontend: http://localhost:3200
echo   Backend:  http://localhost:8200
echo   API Docs: http://localhost:8200/docs
echo ════════════════════════════════════════════════════════
echo.
echo Press Ctrl+C to stop, or close this window.
echo To stop all services, run: taskkill /f /im python.exe ^& taskkill /f /im node.exe

pause >nul
