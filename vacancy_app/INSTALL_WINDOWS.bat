@echo off
REM ============================================
REM PZTMS — Windows One-Click Installer (SQLite version)
REM ============================================
echo.
echo ====================================================
echo  Pune Zone Transferee Management System - Installer
echo  Database: SQLite (no install needed)
echo ====================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python is not installed.
    echo Install Python 3.11+ from https://www.python.org/downloads/
    echo IMPORTANT: tick "Add Python to PATH" during install.
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed.
    echo Install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

where yarn >nul 2>nul
if errorlevel 1 (
    echo Installing Yarn globally...
    call npm install -g yarn
)

echo.
echo [1/3] Installing backend dependencies...
cd backend
if exist venv rmdir /s /q venv
python -m venv venv
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Backend install failed. Check the error above.
    pause
    exit /b 1
)
cd ..

echo.
echo [2/3] Installing frontend dependencies (5 min)...
cd frontend
call yarn install
if errorlevel 1 (
    echo [ERROR] Frontend install failed.
    pause
    exit /b 1
)
cd ..

echo.
echo [3/3] Writing local environment files (forced)...
> frontend\.env (
    echo REACT_APP_BACKEND_URL=http://localhost:8001
    echo WDS_SOCKET_PORT=3000
    echo ENABLE_HEALTH_CHECK=false
)
echo  frontend\.env  -> points to http://localhost:8001
echo  backend\.env   -> SQLite file at backend\pune_zone.db
echo.
echo ====================================================
echo  INSTALLATION COMPLETE
echo ====================================================
echo.
echo  TO RUN (pick one):
echo    A) Double-click START_APP_SILENT.vbs   (silent, no windows)
echo    B) Double-click START_APP.bat          (visible, for debugging)
echo.
echo  TO STOP:
echo    Double-click STOP_APP.bat
echo.
echo  LOGIN at http://localhost:3000
echo    Admin  - CPFNO: 2266083  Password: PuneAdmin@123
echo    Viewer - CPFNO: 1000000  Password: viewer123
echo.
pause
