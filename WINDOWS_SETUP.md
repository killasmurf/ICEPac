# ICEPac Setup Guide for Windows

This guide provides Windows-specific instructions for setting up the ICEPac project.

## Prerequisites

1. **Python 3.11+**: Download from [python.org](https://www.python.org/downloads/)
2. **Java Runtime Environment (JRE) 8+**: Download from [java.com](https://www.java.com/)
3. **Git**: Download from [git-scm.com](https://git-scm.com/)
4. **Visual Studio Code** (recommended): Download from [code.visualstudio.com](https://code.visualstudio.com/)

## Quick Setup (Automated)

The easiest way to set up the project on Windows:

```cmd
# Clone the repository (if not already done)
git clone https://github.com/killasmurf/icepac.git
cd icepac

# Run the automated setup script
setup.bat
```

The script will:
- Create a virtual environment
- Install all dependencies
- Set up pre-commit hooks
- Create a .env file from the template

## Manual Setup

If you prefer to set up manually:

### 1. Clone the Repository

```cmd
git clone https://github.com/killasmurf/icepac.git
cd icepac
```

### 2. Create Virtual Environment

```cmd
python -m venv venv
```

### 3. Activate Virtual Environment

```cmd
venv\Scripts\activate
```

You should see `(venv)` in your command prompt.

### 4. Upgrade pip

```cmd
python -m pip install --upgrade pip
```

### 5. Install Dependencies

```cmd
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 6. Set Up Pre-commit Hooks

```cmd
pre-commit install
```

### 7. Configure Environment

```cmd
copy .env.example .env
notepad .env
```

Edit the `.env` file with your configuration:
```
MPXJ_JAR_PATH=./mpxj-12.x.x.jar
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

### 8. Download MPXJ Library

1. Visit https://mpxj.org/
2. Download the latest version (e.g., mpxj-12.x.x.zip)
3. Extract and place the JAR file in the project root
4. Update `MPXJ_JAR_PATH` in `.env` to match the filename

## Using the Batch Scripts

The project includes convenient batch scripts for common tasks:

### Start Development Server

```cmd
run.bat
```

The server will start at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Run Tests

```cmd
test.bat
```

This runs all tests with coverage reporting.

### Format Code

```cmd
format.bat
```

Runs Black and isort to format your code.

### Run Linters

```cmd
lint.bat
```

Runs flake8, pylint, and mypy.

## Development Workflow

### Daily Workflow

1. **Activate virtual environment** (if not already active):
   ```cmd
   venv\Scripts\activate
   ```

2. **Pull latest changes**:
   ```cmd
   git pull
   ```

3. **Run tests** to ensure everything works:
   ```cmd
   test.bat
   ```

4. **Start development server**:
   ```cmd
   run.bat
   ```

5. **Make your changes** in your editor

6. **Format and lint** before committing:
   ```cmd
   format.bat
   lint.bat
   ```

7. **Run tests** again:
   ```cmd
   test.bat
   ```

8. **Commit your changes**:
   ```cmd
   git add .
   git commit -m "Your descriptive message"
   git push
   ```

### Opening in VS Code

```cmd
# Open the workspace
code icepac.code-workspace
```

Or from VS Code:
1. File → Open Workspace from File
2. Select `icepac.code-workspace`

## Troubleshooting

### Virtual Environment Issues

**Problem**: `venv\Scripts\activate` not found

**Solution**: Create the virtual environment:
```cmd
python -m venv venv
```

### Python Not Found

**Problem**: `'python' is not recognized as an internal or external command`

**Solution**:
1. Reinstall Python and check "Add Python to PATH"
2. Or use full path: `C:\Python311\python.exe`

### Java Not Found

**Problem**: MPXJ library not working

**Solution**:
1. Install Java: `java -version` to check
2. Update `MPXJ_JAR_PATH` in `.env`

### Pre-commit Hook Failures

**Problem**: Pre-commit hooks prevent commits

**Solution**:
```cmd
# Run formatters
format.bat

# Fix any remaining issues manually
# Then try committing again
```

### Port Already in Use

**Problem**: Port 8000 is already in use

**Solution**:
```cmd
# Find and kill the process using port 8000
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Or use a different port
uvicorn app.main:app --reload --port 8001
```

### Import Errors

**Problem**: `ModuleNotFoundError` when running the app

**Solution**:
1. Ensure virtual environment is activated
2. Reinstall dependencies:
   ```cmd
   pip install -r requirements.txt
   ```

## Running with Docker

If you prefer to use Docker on Windows:

### Build Image

```cmd
docker build -t icepac:latest .
```

### Run Container

```cmd
docker run -p 8000:8000 icepac:latest
```

### Using Docker Compose

```cmd
docker-compose up
```

## Additional Tools (Optional)

### Install Make for Windows

If you want to use the Makefile:

1. **Option 1 - Chocolatey**:
   ```cmd
   choco install make
   ```

2. **Option 2 - WSL (Windows Subsystem for Linux)**:
   - Install WSL
   - Use Linux commands inside WSL

### Install Windows Terminal

For a better command-line experience:
- Download from Microsoft Store: "Windows Terminal"

## Next Steps

1. ✅ Set up complete
2. 📖 Read [SETUP.md](SETUP.md) for general documentation
3. 📝 Review [.claude/quick_start.md](.claude/quick_start.md) for quick reference
4. 🚀 Start coding!

## Getting Help

- Check [SETUP.md](SETUP.md) for general setup
- See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- Review [.claude/tasks.md](.claude/tasks.md) for development roadmap
- Open an issue on GitHub for problems

---

**Happy coding on Windows!** 🎉
