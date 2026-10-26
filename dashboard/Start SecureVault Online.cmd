@echo off
setlocal
cd /d "%~dp0"
echo Building SecureVault for online use...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo Build failed. Check the messages above.
  pause
  exit /b 1
)
echo.
node server\online.mjs
if errorlevel 1 (
  echo.
  echo The online launcher stopped. Check the messages above.
)
echo.
pause
