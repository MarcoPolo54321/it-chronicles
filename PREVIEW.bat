@echo off
cd /d "%~dp0"
npm.cmd install
npm.cmd run serve -- -l 8080
pause
