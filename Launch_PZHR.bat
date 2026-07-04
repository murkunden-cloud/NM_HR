@echo off
title PZHR Web Server
color 0B
echo ========================================================
echo        STARTING PZHR LIVE PRODUCTION SERVER
echo ========================================================
echo.
echo The server is launching on your local network...
echo Your Live Network Address is: http://192.168.0.200:3001
echo Local Address: http://localhost:3001
echo.
echo DO NOT CLOSE THIS WINDOW while using the app!
echo To stop the server, press CTRL+C.
echo.
cd /d "%~dp0"
npm run start
pause
