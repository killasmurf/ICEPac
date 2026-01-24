# AI Coding Guidelines for icepac

## Project Overview
icepac is a Python web application for processing Microsoft Project (.mpp) files. The application follows a modular Flask/FastAPI-style architecture with clear separation of concerns.

## Architecture Patterns

### Application Structure
- **`app/`**: Main application package
  - **`routes/`**: API endpoints and web routes (e.g., `routes/project.py` for project-related endpoints)
  - **`models/`**: Data models and database schemas (e.g., `models/project.py` for project data structures)
  - **`services/`**: Business logic and external integrations (e.g., `services/mpp_reader.py` for MPP file processing)
  - **`utils/`**: Shared utilities and helpers (e.g., `utils/validators.py` for input validation)
- **`tests/`**: Unit and integration tests mirroring the app structure

### Key Components
- **MPP Reader Service**: Core functionality for parsing and processing Microsoft Project files
- **Project Management**: RESTful API for project data operations
- **Validation Layer**: Centralized input validation and data sanitization

## Development Workflow

### Environment Setup
```bash
# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run with Docker
docker-compose up --build
```

### Testing
```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_mpp_reader.py
```

### Code Style
- Use type hints for all function parameters and return values
- Follow PEP 8 naming conventions
- Import statements: standard library, third-party, local modules (separated by blank lines)
- Use descriptive variable names; avoid single-letter variables except in comprehensions

## MPP File Processing
- Primary data source is Microsoft Project (.mpp) files
- Focus on extracting project structure, tasks, resources, and timelines
- Validate MPP file integrity before processing
- Handle large files efficiently with streaming where possible

## API Design
- RESTful endpoints under `/api/v1/` prefix
- JSON request/response format
- Consistent error response structure with error codes and messages
- Use HTTP status codes appropriately (200, 201, 400, 404, 500)

## Data Validation
- Validate all inputs in `utils/validators.py`
- Use Pydantic models for request/response validation
- Sanitize file uploads and external data
- Provide clear validation error messages

## Error Handling
- Centralized error handling in service layer
- Log errors with appropriate levels (DEBUG, INFO, WARNING, ERROR)
- Return user-friendly error messages without exposing internal details
- Handle MPP parsing errors gracefully with fallback options

## File Organization
- One primary class/function per file in services and utils
- Related functionality grouped in modules
- Keep route handlers thin; delegate to services
- Use relative imports within the app package