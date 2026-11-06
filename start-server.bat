@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  echo Install it from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

echo Starting KЛAC server...
echo Press Ctrl+C to stop it.
echo Open http://127.0.0.1:8080/ in your browser.
echo.
node server.js

pause