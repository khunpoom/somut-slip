@echo off
chcp 65001 >nul
title Somut Slip
echo.
echo  Somut Slip
echo  Hobby project written with Grok
echo.
where npm >nul 2>&1
if %errorlevel%==0 (
  echo  Starting the local app...
  start "" cmd /c "npm run dev"
  timeout /t 5 /nobreak >nul
  start "" "http://127.0.0.1:8080/"
  goto :eof
)
echo  Node/npm not found. Opening the source repo instead.
start "" "https://github.com/khunpoom/somut-slip"
pause
