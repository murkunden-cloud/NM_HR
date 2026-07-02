@echo off
REM ============================================
REM PZTMS — One-Click Start (visible windows for debugging)
REM For silent mode, use START_APP_SILENT.vbs instead
REM ============================================
echo.
echo Starting Pune Zone Transferee Management System...

REM Kill anything on the ports first
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul

start "PZTMS Backend (port 8001)" cmd /c "cd backend && call venv\Scripts\activate.bat && uvicorn server:app --host 0.0.0.0 --port 8001"
timeout /t 6 /nobreak >nul
start "PZTMS Frontend (port 3000)" cmd /c "cd frontend && yarn start"

echo.
echo  Backend:  http://localhost:8001
echo  Frontend: http://localhost:3000
echo.
echo  Login: 2266083 / PuneAdmin@123
echo.
echo  For silent (no command windows), use START_APP_SILENT.vbs
echo.
timeout /t 18 /nobreak >nul
start http://localhost:3000
exit
