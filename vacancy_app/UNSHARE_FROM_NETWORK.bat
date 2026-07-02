@echo off
REM Remove the firewall rules we added (cleanup, optional)
net session >nul 2>&1
if errorlevel 1 (
    echo Run this AS ADMINISTRATOR.
    pause
    exit /b 1
)
netsh advfirewall firewall delete rule name="PZTMS Frontend" >nul 2>nul
netsh advfirewall firewall delete rule name="PZTMS Backend" >nul 2>nul
echo Firewall rules removed. App can no longer be accessed from other PCs.
echo (Use RUN_ME_FIRST.bat to start in local-only mode again.)
timeout /t 5 >nul
exit
