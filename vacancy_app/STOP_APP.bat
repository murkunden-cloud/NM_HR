@echo off
REM Stop PZTMS — kills processes on ports 8001 and 3000
echo Stopping PZTMS...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo Done. Ports 8001 and 3000 are now free.
echo You can close this window.
timeout /t 4 >nul
exit
