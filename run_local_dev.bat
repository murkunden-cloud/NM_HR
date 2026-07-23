@echo off
echo ========================================================
echo Starting Local HRMS Development Server
echo ========================================================
echo.
echo Please wait while the local server starts. 
echo A browser window will open automatically.
echo Keep this window open while you are testing!
echo.
echo Press Ctrl+C in this window when you want to stop the server.
echo.

:: Wait 3 seconds before opening the browser so the server has time to start
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3001"

npm run dev
