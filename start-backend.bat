@echo off
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
) else (
  echo Node.js is not installed or not available in PATH.
  echo Please install Node.js from https://nodejs.org/
  echo Then run this file again.
  pause
)
