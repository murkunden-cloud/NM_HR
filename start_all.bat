@echo off
echo ========================================================
echo Starting PZHR Web System (Fully Natively Integrated)
echo ========================================================
echo.

echo Starting Vacancy Backend Server (Port 4002)...
start "Vacancy Backend" cmd /c "cd /d D:\MYPRO\pzhr_web\vacancy_app\backend && call venv\Scripts\activate.bat && uvicorn server:app --port 4002 --host 0.0.0.0"

echo Starting PZHR Web Main Server (Port 3000)...
start "PZHR Web" cmd /c "cd /d D:\MYPRO\pzhr_web && echo Syncing Roster Excel Data... && node src\components\Roster\generate-data.js && npm run dev"

echo.
echo ========================================================
echo Success! 
echo All legacy frontend servers (Roster App, Vacancy App) have been retired.
echo The entire UI is now running natively inside PZHR Web on port 3000!
echo.
echo Please wait about 10 seconds for Next.js to finish compiling.
echo Then, open your browser and go to: http://localhost:3000
echo ========================================================
pause
