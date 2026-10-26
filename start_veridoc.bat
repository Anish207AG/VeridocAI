@echo off
setlocal enabledelayedexpansion
title VeriDoc AI — Startup Controller

echo =====================================================================
echo           VERIDOC AI — LAUNCH ^& RUNTIME ORCHESTRATOR
echo    Intelligent Institutional Verification ^& Compliance Platform
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. Check Python installation
python --version >nul 2^>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not detected in your PATH.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo or via the Microsoft Store, and ensure "Add Python to PATH" is checked.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PY_VER=%%i
echo [OK] Detected %PY_VER%

:: 2. Check Node.js installation
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not detected in your PATH.
    echo Please install Node.js (LTS version) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Detected Node.js %NODE_VER%
echo.

:: 3. Setup Python Virtual Environment
if not exist "backend\.venv\Scripts\python.exe" (
    echo [SETUP] Initializing Python virtual environment in backend\.venv...
    python -m venv --system-site-packages backend\.venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to initialize Python virtual environment.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created.
)

:: 4. Verify Backend Dependencies
echo [CHECK] Verifying backend dependencies...
backend\.venv\Scripts\python.exe -c "import fastapi, uvicorn, sqlalchemy, pydantic, reportlab, networkx" >nul 2>&1
if %errorlevel% neq 0 (
    echo [SETUP] Installing backend packages from requirements.txt...
    backend\.venv\Scripts\python.exe -m pip install --default-timeout=180 -r backend\requirements.txt
) else (
    echo [OK] Backend dependencies satisfied.
)

:: 5. Verify Frontend Dependencies
echo [CHECK] Verifying frontend dependencies...
if not exist "frontend\node_modules" (
    echo [SETUP] Installing frontend node packages...
    cd frontend
    call npm.cmd install
    cd ..
) else (
    echo [OK] Frontend dependencies satisfied.
)
echo.

:: 6. Initialize Database ^& Seed Demonstration Scenarios
echo [DATABASE] Initializing SQLite schema and generating sample PDFs...
backend\.venv\Scripts\python.exe backend\seed.py
if %errorlevel% neq 0 (
    echo [WARN] Seed script completed with warnings. Proceeding to server launch.
)
echo.

:: 7. Clean up stale ports if needed
echo [CHECK] Checking ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo [CLEANUP] Freeing stale port 8000 (PID: %%a)...
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo [CLEANUP] Freeing stale port 5173 (PID: %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

:: 8. Launch FastAPI Backend
echo [LAUNCH] Starting FastAPI backend on http://127.0.0.1:8000...
start "VeriDoc AI — Backend Service" cmd /k "cd /d %~dp0\backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 9. Launch Vite Frontend
echo [LAUNCH] Starting Vite frontend on http://localhost:5173...
start "VeriDoc AI — Frontend Interface" cmd /k "cd /d %~dp0\frontend && npm.cmd run dev"

:: 10. Wait and Health Check
echo [POLL] Waiting for backend and frontend services to be ready...
set READY=0
for /l %%i in (1,1,20) do (
    if !READY! equ 0 (
        timeout /t 1 /nobreak >nul
        curl.exe -s http://127.0.0.1:8000/api/health >nul 2>&1
        if !errorlevel! equ 0 (
            set READY=1
            echo [OK] Backend responded healthy at http://127.0.0.1:8000/api/health
        )
    )
)

:: 11. Launch Default Browser
echo [BROWSER] Launching VeriDoc AI in your default web browser...
start http://localhost:5173

echo.
echo =====================================================================
echo                    VERIDOC AI IS NOW RUNNING!
echo =====================================================================
echo.
echo   * Web Interface:      http://localhost:5173
echo   * Backend REST API:   http://localhost:8000
echo   * Interactive Docs:   http://localhost:8000/docs
echo   * Health Endpoint:    http://localhost:8000/api/health
echo.
echo Leave the backend and frontend terminal windows open while working.
echo To safely stop all services, run 'stop_veridoc.bat'.
echo =====================================================================
echo.
pause
