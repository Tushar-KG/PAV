@echo off
setlocal
cd /d "%~dp0"
title PAV - Play Any Video

:: 1. If packaged binary exists, launch it directly
if exist "%~dp0dist\PAV-win32-x64\PAV.exe" (
    start "" "%~dp0dist\PAV-win32-x64\PAV.exe" %*
    exit /b 0
)

:: 2. Otherwise launch via Electron in development mode
echo Starting PAV (Play Any Video)...

if not exist "%~dp0node_modules" (
    echo [PAV] node_modules not found. Installing project dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies. Please verify Node.js and npm are in your PATH.
        pause
        exit /b 1
    )
)

call npm start -- %*
if errorlevel 1 (
    echo.
    echo [ERROR] Application exited with an error code.
    pause
    exit /b 1
)
