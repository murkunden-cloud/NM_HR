@echo off
echo ========================================================
echo Starting PZHR Web System (Production Mode)
echo ========================================================
echo.

echo Starting Vacancy Backend Server (Port 4002)...
start "Vacancy Backend (Prod)" cmd /c "cd /d D:\MYPRO\pzhr_web\vacancy_app\backend && call venv\Scripts\activate.bat && uvicorn server:app --port 4002 --host 0.0.0.0"

echo Building Next.js application for Production (this will skip if up to date)...
call npm run build

echo.
echo Starting PZHR Web Main Server in Production (Port 3000)...
start "PZHR Web (Prod)" cmd /c "cd /d D:\MYPRO\pzhr_web && npm start"

echo.
echo ========================================================
echo Success! 
echo The system is now running in production mode.
echo Ensure port 3000 and 4002 are open in the Windows Firewall for Intranet access.
echo You can access it on this PC at: http://localhost:3000
echo Others can access it via http://YOUR-IP-ADDRESS:3000 or http://hr.punezone.com (if DNS is configured)
echo ========================================================
pause
