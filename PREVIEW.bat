@echo off
cd /d "%~dp0"
call npm.cmd run serve -- -l 8080
pause
