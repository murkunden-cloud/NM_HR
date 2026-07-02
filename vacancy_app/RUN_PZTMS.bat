@echo off
REM ============================================
REM PZTMS - Complete Setup & Run (One-Click)
REM Pune Zone Transferee Management System
REM ============================================
setlocal
cd /d "%~dp0"

echo.
echo ====================================================
echo   Pune Zone Transferee Management System
echo   Professional Corporate Dashboard
echo ====================================================
echo.

REM Check if first-time setup needed
if not exist "backend\venv\Scripts\python.exe" goto INSTALL
if not exist "frontend\node_modules" goto INSTALL
if not exist "frontend\.env" goto CONFIG
goto RUN

:INSTALL
echo.
echo [FIRST-TIME SETUP] Installing dependencies...
echo This will take 5-10 minutes (only once)...
echo.

REM Check prerequisites
where python >nul 2>nul || (
    echo [ERROR] Python is not installed.
    echo Install Python 3.11+ from https://www.python.org/downloads/
    echo IMPORTANT: Tick "Add Python to PATH" during install.
    pause
    exit /b 1
)

where node >nul 2>nul || (
    echo [ERROR] Node.js is not installed.
    echo Install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

where yarn >nul 2>nul || (
    echo Installing Yarn globally...
    call npm install -g yarn
)

REM Backend setup
echo [1/3] Installing backend dependencies...
cd backend
if exist venv rmdir /s /q venv
python -m venv venv
call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Backend install failed.
    pause
    exit /b 1
)
cd ..

REM Frontend setup
echo [2/3] Installing frontend dependencies (5 min)...
cd frontend
call yarn install
if errorlevel 1 (
    echo [ERROR] Frontend install failed.
    pause
    exit /b 1
)
cd ..

:CONFIG
echo [3/3] Configuring environment...
> frontend\.env (
    echo REACT_APP_BACKEND_URL=http://localhost:8001
    echo WDS_SOCKET_PORT=3000
    echo ENABLE_HEALTH_CHECK=false
    echo SKIP_PREFLIGHT_CHECK=true
    echo BROWSER=none
)
echo Configuration complete.

:RUN
echo.
echo ====================================================
echo   Starting PZTMS...
echo ====================================================
echo.

REM Kill existing processes on ports
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul
timeout /t 2 /nobreak >nul

REM Start backend
echo Starting Backend (port 8001)...
start "PZTMS Backend" cmd /c "cd backend && call venv\Scripts\activate.bat && uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

REM Wait for backend to start and initialize database
echo Waiting for backend to initialize (8 seconds)...
timeout /t 8 /nobreak >nul

REM Check if backend is running
echo Checking backend status...
curl -s http://localhost:8001/api/auth/me >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Backend may not be responding yet. Continuing with frontend startup...
) else (
    echo [OK] Backend is responding.
)

REM Start frontend (without auto-opening browser)
echo Starting Frontend (port 3000)...
start "PZTMS Frontend" cmd /c "cd frontend && set BROWSER=none && yarn start"

REM Wait for frontend to start
echo Waiting for frontend to start (10 seconds)...
timeout /t 10 /nobreak >nul

echo.
echo ====================================================
echo   SYSTEM READY
echo ====================================================
echo.
echo   Backend:  http://localhost:8001
echo   Frontend: http://localhost:3000
echo.
echo   LOGIN CREDENTIALS:
echo   ------------------
echo   Admin  - CPFNO: 2266083  Password: PuneAdmin@123
echo   Viewer - CPFNO: 1000000  Password: viewer123
echo.
echo   Opening browser...
echo.

start http://localhost:3000

echo.
echo ====================================================
echo   TROUBLESHOOTING
echo ====================================================
echo.
echo If login fails:
echo 1. Check the "PZTMS Backend" window for errors
echo 2. Check the "PZTMS Frontend" window for errors
echo 3. Ensure ports 8001 and 3000 are not blocked
echo 4. Try clearing browser cache and cookies
echo.
echo To stop the application, run STOP_APP.bat
echo.
pause
exit
