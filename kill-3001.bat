@echo off
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo Killing process %%a on port 3001
    taskkill /F /PID %%a
)
