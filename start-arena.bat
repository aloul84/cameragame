@echo off
setlocal
title FATH ARENA - Booth Launcher
cd /d "%~dp0"

rem ==================================================================
rem  FATH ARENA - one-click booth launcher
rem  1) starts the local server   2) opens the game full screen (kiosk)
rem  Inside the game:  Esc = operator settings     Alt+F4 = exit
rem ==================================================================

set "PORT=8080"
set "URL=http://localhost:%PORT%/arena.html?autostart=1"
set "PROFILE=%LocalAppData%\FathArena\browser-profile"

rem ---- 1) Python (runs the local server) ----
set "PY="
python --version >nul 2>nul
if not errorlevel 1 set "PY=python"
if not defined PY (
  py --version >nul 2>nul
  if not errorlevel 1 set "PY=py"
)
if not defined PY (
  echo.
  echo  [X] Python was not found.
  echo      Install it from https://www.python.org/downloads/ then run this file again.
  echo.
  pause
  exit /b 1
)

start "FATH ARENA server" /min %PY% "%~dp0tools\arena-server.py" %PORT%
timeout /t 2 /nobreak >nul

rem ---- 2) Browser: Google Chrome, otherwise Microsoft Edge ----
set "BROWSER="
for %%B in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do if not defined BROWSER if exist "%%~B" set "BROWSER=%%~B"

if not defined BROWSER (
  echo.
  echo  [X] Google Chrome or Microsoft Edge was not found.
  echo.
  pause
  exit /b 1
)

rem A separate browser profile: the flags always apply, and the camera
rem permission + today's leaderboard are remembered between restarts.
start "" "%BROWSER%" --kiosk "%URL%" --user-data-dir="%PROFILE%" ^
  --edge-kiosk-type=fullscreen --no-first-run --no-default-browser-check ^
  --autoplay-policy=no-user-gesture-required --disable-features=Translate ^
  --disable-pinch --overscroll-history-navigation=0 --noerrdialogs ^
  --disable-session-crashed-bubble --disable-infobars

echo.
echo  FATH ARENA is running.
echo  - First launch only: click "Allow" when the browser asks for the camera.
echo  - To stop: press Alt+F4 on the game, then close the "FATH ARENA server" window.
echo.
timeout /t 8 >nul
endlocal
