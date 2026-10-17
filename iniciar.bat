@echo off
cd /d "%~dp0"
echo Instalando/verificando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo ERRO no npm install. Veja a mensagem acima.
  pause
  exit /b 1
)
start "" http://localhost:3000
node server.js
pause
