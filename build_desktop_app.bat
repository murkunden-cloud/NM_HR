@echo off
echo Building NM_HR_Portal.exe with HR Icon...
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /target:winexe /win32icon:"d:\MYPRO\pzhr_web\hr_icon.ico" /out:"%USERPROFILE%\Desktop\NM_HR_Portal.exe" "d:\MYPRO\pzhr_web\launcher.cs"
echo Done! You can find NM_HR_Portal.exe on your Desktop.
pause
