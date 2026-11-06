@echo off
title Kalyana Sundaram - Original 3D Portfolio
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS is required. Install Node.js from https://nodejs.org/
  pause
  exit /b 1
)
echo Starting the editable portfolio with the original 3D destruction demo...
node server.cjs --open
if errorlevel 1 (
  echo Server stopped with an error.
  pause
)
