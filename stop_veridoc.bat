@echo off
setlocal enabledelayedexpansion
title VeriDoc AI — Service Terminator

echo =====================================================================
echo              VERIDOC AI — SERVICE SHUTDOWN CONTROLLER
echo =====================================================================
echo.

set STOPPED=0

echo [TERMINATE] Scanning for active listeners on port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Terminating backend process on port 8000 (PID: %%a)...
    taskkill /PID %%a /F >nul 2>&1
    set STOPPED=1
)

echo [TERMINATE] Scanning for active listeners on port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Terminating frontend process on port 5173 (PID: %%a)...
    taskkill /PID %%a /F >nul 2>&1
    set STOPPED=1
)

echo.
if !STOPPED! equ 1 (
    echo [OK] VeriDoc AI services terminated cleanly. Ports 8000 and 5173 released.
) else (
    echo [INFO] No active VeriDoc AI services were found running on ports 8000 or 5173.
)

echo.
pause
