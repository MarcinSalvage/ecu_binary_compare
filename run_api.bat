@echo off
REM ECU Binary Compare - Windows API Launcher

echo ==========================================
echo   ECU Binary Compare - API Launcher
echo ==========================================
echo.

cd /d "%~dp0api"

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not found!
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Create venv if needed
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate venv and install requirements
echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

if exist "requirements.txt" (
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Start the server
echo.
echo Starting ECU Binary Compare API...
echo    Web UI: http://localhost:5000
echo    API:   http://localhost:5000/api
echo.
python ecu_compare.py

pause
