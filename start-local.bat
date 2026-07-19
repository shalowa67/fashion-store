@echo off
rem Start backend for the Fashion Store project and open the signup page.

set ROOT=%~dp0

rem Start backend in a new terminal
start "Fashion Store Backend" cmd /k "cd /d "%ROOT%backend" && npm start"

rem Give the backend a moment to start, then open the signup page
powershell -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5000/signup.html'"

echo Started backend in a new terminal.
echo Opened browser at http://localhost:5000/signup.html
pause