@echo off
title NostaChat Manager
echo ========================================
echo   Zapusk NostaChat (Server + Desktop)
echo ========================================
echo.

echo Zapusk Servera (port 3002)...
start "NostaChat Server" cmd /k "cd packages\server && npm run dev"

echo.
echo Zapusk Desktop Klienta (port 5173)...
start "NostaChat Desktop" cmd /k "cd packages\desktop && npm run dev"

echo.
echo ----------------------------------------
echo Klient budet dostupen po adresu:
echo http://localhost:5173
echo ----------------------------------------
echo.
pause
