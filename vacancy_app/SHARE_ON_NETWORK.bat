@echo off
REM ===================================================
REM   PZTMS - Build for production + share on network
REM   Single port (8001) - no WebSocket - no CORS issues
REM
REM   Run AS ADMINISTRATOR (right-click -> Run as administrator)
REM ===================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
    echo Run AS ADMINISTRATOR. Right-click this file, choose "Run as administrator".
    pause
    exit /b 1
)

REM Detect LAN IP
set LANIP=
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    set RAWIP=%%i
    set RAWIP=!RAWIP: =!
    echo !RAWIP! | findstr /B "127." >nul
    if errorlevel 1 if not defined LANIP set LANIP=!RAWIP!
)
if not defined LANIP (
    echo Could not detect network IP. Are you connected to WiFi or LAN?
    pause
    exit /b 1
)

echo.
echo ====================================================
echo  Setting up office network sharing
echo  Your PC IP: %LANIP%
echo ====================================================
echo.

REM Stop anything running on our port
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>nul

REM Firewall — only port 8001 needed now (single port deployment)
echo Opening Windows Firewall for port 8001...
netsh advfirewall firewall delete rule name="PZTMS" >nul 2>nul
netsh advfirewall firewall add rule name="PZTMS" dir=in action=allow protocol=TCP localport=8001 profile=any >nul

REM Tell frontend to use same-origin (when served from backend)
> frontend\.env (
    echo REACT_APP_BACKEND_URL=
    echo SKIP_PREFLIGHT_CHECK=true
)

REM Build the frontend if not already built or if outdated
if not exist "frontend\build\index.html" goto DO_BUILD
echo Frontend build folder exists, skipping rebuild.
echo (Delete frontend\build folder if you want to rebuild.)
goto START

:DO_BUILD
echo.
echo Building production frontend (one-time, 2-3 min)...
cd frontend
call yarn build
if errorlevel 1 (
    echo Frontend build failed.
    pause
    exit /b 1
)
cd ..

:START
echo.
echo Starting server on port 8001 (minimized)...
start "PZTMS Server" /min cmd /c "cd backend && call venv\Scripts\activate.bat && uvicorn server:app --host 0.0.0.0 --port 8001"

timeout /t 6 /nobreak >nul

echo.
echo ====================================================
echo  APP IS RUNNING ON YOUR OFFICE NETWORK
echo ====================================================
echo.
echo  Share this URL with your colleagues:
echo.
echo     http://%LANIP%:8001
echo.
echo  Login:
echo     Admin  - CPFNO 2266083 - PuneAdmin@123
echo     Viewer - CPFNO 1000000 - viewer123
echo.
echo  Notes:
echo    - This PC must stay ON while colleagues use it
echo    - Single port (8001) - no WebSocket - no CORS issues
echo    - To stop: run STOP_APP.bat
echo.
echo  Opening browser locally in 8 seconds...
timeout /t 8 /nobreak >nul
start http://localhost:8001
echo.
echo Done. Close this window.
timeout /t 4 >nul
exit
