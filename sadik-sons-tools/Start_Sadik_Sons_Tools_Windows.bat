@echo off
title Sadik Sons Tool Custody Network
echo ====================================================
echo   ⚡ SADIK SONS | Tool Custody & Asset Network
echo ====================================================
echo Starting internal tool server...

start /B node server.cjs

timeout /t 2 /nobreak >nul

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
) else (
    start http://localhost:3000
)
