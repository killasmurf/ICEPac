@echo off
REM ICEPac Test Runner
REM Activates virtual environment and runs pytest

echo Running ICEPac Tests...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Error: Virtual environment not found!
    echo Please create it first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo   pip install -r requirements-dev.txt
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Run pytest with coverage
pytest

REM Keep window open if running standalone
if "%1"=="" pause
