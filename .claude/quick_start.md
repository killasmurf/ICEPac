# ICEPac Quick Start Guide

## Project Overview
ICEPac is a FastAPI-based REST API for reading and parsing Microsoft Project files.

## Quick Commands

### Development

**Windows (Batch Scripts):**
```cmd
run.bat          # Start development server
test.bat         # Run tests
format.bat       # Format code
lint.bat         # Run linters
setup.bat        # Initial project setup
```

**Linux/Mac (Make or Direct):**
```bash
# Using make
make run         # Start development server
make test        # Run tests
make format      # Format code
make lint        # Run linters

# Or directly
uvicorn app.main:app --reload
```

**Manual Commands:**
```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Testing
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific types
pytest -m unit
pytest -m integration
```

### Code Quality
```bash
# Format code
black app tests
isort app tests

# Lint
flake8 app tests
pylint app tests

# Type check
mypy app
```

### Docker
```bash
# Build
docker build -t icepac .

# Run
docker run -p 8000:8000 icepac

# Docker Compose
docker-compose up
```

## Important Files
- `app/main.py` - FastAPI application entry point
- `app/services/mpp_reader.py` - MPP file parsing logic
- `app/routes/project.py` - API route handlers
- `app/models/project.py` - Pydantic data models
- `.env` - Environment configuration
- `pytest.ini` - Test configuration

## API Endpoints
- `GET /health` - Health check
- `POST /api/v1/upload` - Upload project file
- `GET /api/v1/projects/{id}` - Get project data
- `GET /docs` - Interactive API documentation

## Environment Variables
```
MPXJ_JAR_PATH=./mpxj-12.x.x.jar
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

## Common Tasks

### Add New Endpoint
1. Define Pydantic models in `app/models/`
2. Create route handler in `app/routes/`
3. Register route in `app/main.py`
4. Write tests in `tests/`

### Add New Service
1. Create service module in `app/services/`
2. Implement business logic
3. Add tests in `tests/`
4. Import and use in routes

### Run Specific Test
```bash
pytest tests/test_mpp_reader.py::test_specific_function
```

## Debugging
- Use `uvicorn app.main:app --reload --log-level debug` for verbose output
- Check logs in console
- Use VSCode debugger with launch configuration
- Access interactive docs at `/docs` for API testing

## Getting Help
- Check [SETUP.md](../SETUP.md) for detailed setup
- Review [README.md](../README.md) for project overview
- See [.claude/tasks.md](tasks.md) for development roadmap
- Review [.claude/rules.md](rules.md) for coding standards
