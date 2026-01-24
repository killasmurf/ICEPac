# ICEPac on Windows - Quick Start

## Getting Started in 3 Steps

### Step 1: Run Setup
```cmd
setup.bat
```

This will:
- Create virtual environment
- Install all dependencies
- Set up development tools
- Create .env file

### Step 2: Configure Environment

Edit `.env` file and add:
```
MPXJ_JAR_PATH=./mpxj-12.x.x.jar
```

Download MPXJ from https://mpxj.org/ and place the JAR file in the project root.

### Step 3: Start Development

```cmd
run.bat
```

Visit `http://localhost:8000/docs` to see the API documentation.

## Available Commands

| Command | Purpose |
|---------|---------|
| `setup.bat` | Initial project setup |
| `run.bat` | Start development server |
| `test.bat` | Run tests |
| `format.bat` | Format code (Black + isort) |
| `lint.bat` | Run linters (flake8, pylint, mypy) |

## Documentation

- **[WINDOWS_SETUP.md](WINDOWS_SETUP.md)** - Complete Windows setup guide
- **[SETUP.md](SETUP.md)** - General setup documentation
- **[.claude/quick_start.md](.claude/quick_start.md)** - Quick reference
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute

## Project Structure

```
icepac/
├── app/                    # FastAPI application
│   ├── main.py            # Entry point
│   ├── models/            # Pydantic models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── utils/             # Utilities
├── tests/                 # Test suite
├── .claude/               # Claude Code config
├── venv/                  # Virtual environment
├── *.bat                  # Windows scripts
└── requirements.txt       # Dependencies
```

## Need Help?

1. **Full Windows Guide**: See [WINDOWS_SETUP.md](WINDOWS_SETUP.md)
2. **Troubleshooting**: Check the Troubleshooting section in WINDOWS_SETUP.md
3. **Questions**: Open an issue on GitHub

## Claude Code Users

This project is fully configured for Claude Code:
- Open `icepac.code-workspace` in VS Code
- Claude will have full project context
- Coding standards and tasks are pre-configured

---

**You're ready to go!** Run `setup.bat` to begin. 🚀
