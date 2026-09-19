@echo off
setlocal enabledelayedexpansion
title Sadik Sons Tool Custody Network

:: Change directory to where this script is located
cd /d "%~dp0"

echo ====================================================
echo   [SADIK SONS] Tool Custody & Asset Network
echo ====================================================
echo.

:: Check if server.cjs is in current folder or subfolder
if not exist "server.cjs" (
    if exist "sadik-sons-tools\server.cjs" (
        cd sadik-sons-tools
    )
)

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ====================================================
    echo   [ERROR] Node.js is NOT installed on this computer!
    echo ====================================================
    echo.
    echo Node.js is required to run the local SQLite server.
    echo.
    echo 1. Download and install Node.js (LTS version, 100%% free):
    echo    https://nodejs.org
    echo.
    echo Press any key to automatically open the Node.js website...
    pause >nul
    start https://nodejs.org
    echo.
    echo After installing Node.js, double-click this file again!
    echo.
    pause
    exit /b 1
)

echo [1/2] Starting Sadik Sons local server and database...
start "Sadik Sons Server" /min node server.cjs

echo [2/2] Waiting for server initialization...
timeout /t 2 /nobreak >nul

echo [OK] Opening Sadik Sons Desktop Application...

:: Open in standalone window mode (Edge is on all Windows PCs)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000
) else (
    start http://localhost:3000
)

echo.
echo ====================================================
echo   Application is running successfully!
echo   (Keep this window minimized while using the app)
echo ====================================================
echo.
pause
