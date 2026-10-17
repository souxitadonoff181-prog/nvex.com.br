@echo off
cd /d "%~dp0"
call npm install --no-audit --no-fund
node bot.js
pause
