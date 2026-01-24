# ICEPac Setup Guide

This guide will help you set up the ICEPac project for development using Claude Code.

## Prerequisites

- Python 3.11 or higher
- Java Runtime Environment (JRE) 8 or higher (for MPXJ library)
- Git
- Visual Studio Code (recommended)
- Docker (optional, for containerized development)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/killasmurf/icepac.git
cd icepac
```

### 2. Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
# Install production dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt
```

### 4. Set Up Pre-commit Hooks

```bash
pre-commit install
```

### 5. Download MPXJ Library

1. Visit https://mpxj.org/
2. Download the latest version (e.g., mpxj-12.x.x.zip)
3. Extract the JAR file (mpxj-12.x.x.jar)
4. Place it in the project root or update the path in your configuration

### 6. Configure Environment Variables

```bash
# Copy the example environment file
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Edit .env with your configuration
notepad .env  # Windows
# nano .env  # Linux/Mac
```

Required environment variables:
```
MPXJ_JAR_PATH=./mpxj-12.x.x.jar
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

## Development Workflow

### Running the Development Server

```bash
# Using uvicorn directly
uvicorn app.main:app --reload

# Or using the Makefile
make run
```

The API will be available at `http://localhost:8000`

Interactive API docs: `http://localhost:8000/docs`

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test types
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only

# Or using the Makefile
make test
make test-unit
make test-integration
```

### Code Formatting and Linting

```bash
# Format code with Black
black app tests

# Sort imports
isort app tests

# Run linters
flake8 app tests
pylint app tests
mypy app

# Or using the Makefile
make format
make lint
```

## Claude Code Usage

### Opening the Project

1. Open VSCode
2. File > Open Workspace from File
3. Select `icepac.code-workspace`

### Claude Code Configuration

The project includes Claude Code configuration in the `.claude/` directory:

- `project_context.md` - Project overview and architecture
- `rules.md` - Coding standards and guidelines
- `tasks.md` - Development tasks and roadmap

### Using Claude Code

Claude Code is aware of the project context and will:
- Follow the coding standards in `rules.md`
- Reference tasks from `tasks.md`
- Understand the project structure from `project_context.md`

## Docker Development

### Build Docker Image

```bash
docker build -t icepac:latest .

# Or using the Makefile
make docker-build
```

### Run Docker Container

```bash
docker run -p 8000:8000 icepac:latest

# Or using the Makefile
make docker-run
```

### Using Docker Compose

```bash
docker-compose up
```

## Troubleshooting

### Java/MPXJ Issues

If you get Java-related errors:
1. Verify Java is installed: `java -version`
2. Check MPXJ_JAR_PATH in .env
3. Ensure the JAR file exists at the specified path

### Import Errors

If you get import errors:
1. Ensure you're in the virtual environment
2. Reinstall dependencies: `pip install -r requirements.txt`
3. Check your PYTHONPATH

### AWS Credentials

For AWS-related features:
1. Configure AWS credentials in .env
2. Or use AWS CLI: `aws configure`
3. For local development, you can skip AWS features

## Next Steps

1. Review the [README.md](README.md) for project overview
2. Check [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
3. Explore the API documentation at `http://localhost:8000/docs`
4. Review the tasks in [.claude/tasks.md](.claude/tasks.md)

## Getting Help

- Open an issue on GitHub
- Check the documentation in the `docs/` folder
- Review existing issues and pull requests
