@echo off
REM ===================================================
REM   PZTMS - Local-only run (single port, production build)
REM ===================================================
setlocal
cd /d "%~dp0"

REM Detect first-run by venv presence
if not exist "backend\venv\Scripts\python.exe" goto FIRST_RUN
if not exist "frontend\node_modules" goto FIRST_RUN
if not exist "frontend\build\index.html" goto NEED_BUILD
goto START

:FIRST_RUN
echo.
echo ====================================================
echo  First-time setup (8-10 minutes, only this once)
echo ====================================================
echo.

where python >nul 2>nul || (
    echo Python is not installed. Install from https://python.org/downloads/
    echo Tick "Add Python to PATH" during install.
    pause & exit /b 1
)
where node >nul 2>nul || (
    echo Node.js is not installed. Install from https://nodejs.org/
    pause & exit /b 1
)
where yarn >nul 2>nul || call npm install -g yarn

REM Backend
echo [1/4] Backend dependencies...
cd backend
if exist venv rmdir /s /q venv
python -m venv venv
call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 ( echo Backend install failed. & pause & exit /b 1 )
cd ..

REM Frontend deps
echo [2/4] Frontend dependencies (5 min)...
cd frontend
call yarn install
if errorlevel 1 ( echo Frontend install failed. & pause & exit /b 1 )
cd ..

REM Frontend .env for build
echo [3/4] Configuring...
> frontend\.env (
    echo REACT_APP_BACKEND_URL=
    echo SKIP_PREFLIGHT_CHECK=true
    echo BROWSER=none
)

:NEED_BUILD
REM Build frontend (production)
echo [4/4] Building production frontend (2-3 min)...
cd frontend
call yarn build
if errorlevel 1 ( echo Build failed. & pause & exit /b 1 )
cd ..

:START
REM Kill anything on 8001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>nul

echo.
echo Starting PZTMS on http://localhost:8001 ...
start "PZTMS Server" /min cmd /c "cd backend && call venv\Scripts\activate.bat && uvicorn server:app --host 0.0.0.0 --port 8001"

timeout /t 6 /nobreak >nul

echo.
echo  Login at http://localhost:8001
echo    Admin  - CPFNO 2266083 - PuneAdmin@123
echo    Viewer - CPFNO 1000000 - viewer123
echo.
echo  To share with office colleagues: run SHARE_ON_NETWORK.bat (as admin)
echo  To stop: run STOP_APP.bat
echo.

timeout /t 4 /nobreak >nul
start http://localhost:8001
exit
