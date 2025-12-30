@echo off
echo Installing dependencies for builder...
call npm install javascript-obfuscator archiver --save-dev

echo.
echo Starting Obfuscation Process...
node build_obfuscated.js

echo.
pause
