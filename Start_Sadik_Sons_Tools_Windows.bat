@echo off
setlocal enabledelayedexpansion
title Sadik Sons Tool Custody Network

cd /d "%~dp0"

echo ====================================================
echo   [SADIK SONS] Tool Custody & Asset Network
echo ====================================================
echo Working directory: %CD%
echo.

if not exist "server.cjs" (
    if exist "sadik-sons-tools\server.cjs" (
        cd sadik-sons-tools
        echo Found files in subfolder: !CD!
    )
)

echo [Step 1] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ----------------------------------------------------
    echo   [ERROR] Node.js was not found on this computer!
    echo ----------------------------------------------------
    echo   Node.js is required to run the local database.
    echo   Download free installer: https://nodejs.org
    echo.
    echo   Press any key to open the Node.js website...
    pause >nul
    start https://nodejs.org
    echo.
    echo   After installing Node.js, run this file again.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Node.js found: %NODE_VERSION%
echo.

echo [Step 2] Starting internal server on port 3000...
start "Sadik Sons Tools Server" /B node server.cjs

echo [Step 3] Initializing...
timeout /t 2 /nobreak >nul

echo [Step 4] Opening Application Window...
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000
) else (
    start http://localhost:3000
)

echo.
echo ====================================================
echo   SUCCESS! The application is running!
echo   (Keep this window open or minimized while working)
echo ====================================================
echo.
pause
