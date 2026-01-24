@echo off
REM ICEPac Linter
REM Runs flake8, pylint, and mypy

echo Running ICEPac linters...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Error: Virtual environment not found!
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

echo Running flake8...
echo ================
flake8 app tests
echo.

echo Running pylint...
echo ================
pylint app tests
echo.

echo Running mypy...
echo ================
mypy app --ignore-missing-imports
echo.

echo Linting complete!
if "%1"=="" pause
