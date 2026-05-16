@echo off
title FLAMMABLEBUMP Overlay Server
cd /d "%~dp0"
echo Starting FLAMMABLEBUMP overlay server...
echo.
node server.js
echo.
echo Server stopped.
pause
