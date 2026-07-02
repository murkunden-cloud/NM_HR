' ============================================
' PZTMS - Silent Launcher (no CMD windows visible)
' Double-click this to start the app in the background
' ============================================

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = appDir

' Quick kill anything on our ports (silent)
sh.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :8001') do taskkill /F /PID %a 2>nul", 0, True
sh.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %a 2>nul", 0, True

' Start backend (hidden)
sh.Run "cmd /c cd /d """ & appDir & "\backend"" && call venv\Scripts\activate.bat && uvicorn server:app --host 0.0.0.0 --port 8001 > ..\backend.log 2>&1", 0, False

' Wait for backend
WScript.Sleep 6000

' Start frontend (hidden)
sh.Run "cmd /c cd /d """ & appDir & "\frontend"" && yarn start > ..\frontend.log 2>&1", 0, False

' Wait for frontend to compile
WScript.Sleep 25000

' Open browser
sh.Run "http://localhost:3000", 1, False

' Tiny tray notification
sh.Popup "PZTMS is running" & vbCrLf & vbCrLf & _
         "Open in browser: http://localhost:3000" & vbCrLf & vbCrLf & _
         "To stop, run STOP_APP.bat", _
         5, "Pune Zone — Started", 64
