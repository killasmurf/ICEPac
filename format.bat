@echo off
REM ICEPac Code Formatter
REM Runs Black and isort on the codebase

echo Formatting ICEPac code...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Error: Virtual environment not found!
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

echo Running Black formatter...
black app tests
echo.

echo Running isort...
isort app tests
echo.

echo Formatting complete!
if "%1"=="" pause
