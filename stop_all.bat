@echo off
echo ========================================================
echo Shutting down PZHR Web and all integrated applications...
echo ========================================================
echo.

echo Closing command windows...
taskkill /F /FI "WINDOWTITLE eq Roster App*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Vacancy Backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Vacancy Frontend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq PZHR Web*" /T >nul 2>&1

echo.
echo Forcing port cleanup to prevent stuck servers...
powershell -Command "$ports = 3000, 4001, 4002; foreach ($p in $ports) { $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue } }"

echo.
echo All services have been successfully shut down!
echo ========================================================
pause
