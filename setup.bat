@echo off
REM ICEPac Project Setup Script for Windows

echo ================================================
echo ICEPac Project Setup
echo ================================================
echo.

REM Check Python version
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.11 or higher
    pause
    exit /b 1
)

echo Step 1: Creating virtual environment...
if exist venv (
    echo Virtual environment already exists. Skipping creation.
) else (
    python -m venv venv
    if errorlevel 1 (
        echo Error creating virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully!
)
echo.

echo Step 2: Activating virtual environment...
call venv\Scripts\activate.bat
echo.

echo Step 3: Upgrading pip...
python -m pip install --upgrade pip
echo.

echo Step 4: Installing production dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Error installing production dependencies
    pause
    exit /b 1
)
echo.

echo Step 5: Installing development dependencies...
pip install -r requirements-dev.txt
if errorlevel 1 (
    echo Error installing development dependencies
    pause
    exit /b 1
)
echo.

echo Step 6: Setting up pre-commit hooks...
pre-commit install
echo.

echo Step 7: Creating .env file from template...
if exist .env (
    echo .env file already exists. Skipping.
) else (
    if exist .env.example (
        copy .env.example .env
        echo .env file created. Please edit it with your configuration.
    ) else (
        echo Warning: .env.example not found. Please create .env manually.
    )
)
echo.

echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Edit .env file with your configuration
echo 2. Download MPXJ JAR file from https://mpxj.org/
echo 3. Run 'run.bat' to start the development server
echo 4. Run 'test.bat' to run tests
echo.
echo Useful commands:
echo   run.bat       - Start development server
echo   test.bat      - Run tests
echo   format.bat    - Format code
echo   lint.bat      - Run linters
echo.
pause
