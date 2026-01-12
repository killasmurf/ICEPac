# ICEPac

Microsoft Project File Reader and Analysis API

## Description

ICEPac is a production-ready Python web application that reads and parses Microsoft Project files (.mpp, .mpx, .xml) and provides a comprehensive REST API for accessing and managing project data. Built with FastAPI, PostgreSQL, and designed for AWS deployment with complete infrastructure automation.

## Features

- 📁 Upload and parse Microsoft Project files (.mpp, .mpx, .xml)
- 💾 Persistent storage with PostgreSQL database
- ☁️ AWS S3 integration for file storage
- 🔄 Full CRUD operations for projects
- 📊 Extract tasks, resources, and project metadata
- 🚀 High-performance async FastAPI backend
- 🔐 Input validation and error handling
- 📝 Structured logging with JSON support
- 🧪 Comprehensive test coverage
- 🐳 Docker and Docker Compose support
- 🔄 Database migrations with Alembic
- 🎯 Production-ready infrastructure

## Architecture

- **API Framework**: FastAPI with async/await
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Caching**: Redis
- **File Storage**: AWS S3
- **File Parsing**: MPXJ library via JPype
- **Migrations**: Alembic
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Java Runtime Environment 17+ (for MPXJ library)
- Docker & Docker Compose (for local development)
- AWS Account (for cloud deployment, optional)

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/ICEPac.git
cd ICEPac
```

2. Create environment file:
```bash
cp .env.example .env
# Edit .env with your configuration (defaults work for local dev)
```

3. Start all services:
```bash
docker-compose up -d
```

4. Run database migrations:
```bash
docker-compose exec app alembic upgrade head
```

The API will be available at `http://localhost:8000`

### Manual Installation

1. Clone and setup:
```bash
git clone https://github.com/YOUR_USERNAME/ICEPac.git
cd ICEPac
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
make install-dev
# or: pip install -r requirements.txt -r requirements-dev.txt
```

3. Setup environment:
```bash
cp .env.example .env
# Edit .env with your PostgreSQL and Redis connection strings
```

4. Run database migrations:
```bash
make db-upgrade
# or: alembic upgrade head
```

5. Start the development server:
```bash
make run
# or: uvicorn app.main:app --reload
```

## Usage

### API Documentation

- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### API Endpoints

#### Project Management
- `POST /api/v1/upload` - Upload and parse a project file
- `GET /api/v1/projects` - List all projects (with pagination)
- `GET /api/v1/projects/{project_id}` - Get project by ID
- `DELETE /api/v1/projects/{project_id}` - Delete a project

#### Health & Info
- `GET /` - Root endpoint with API info
- `GET /health` - Health check

### Example: Upload a Project File

```bash
curl -X POST "http://localhost:8000/api/v1/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@project.mpp"
```

### Example: List Projects

```bash
curl "http://localhost:8000/api/v1/projects?skip=0&limit=10"
```

## Development

### Available Make Commands

```bash
make help           # Show all available commands
make install        # Install production dependencies
make install-dev    # Install development dependencies
make test          # Run tests with coverage
make lint          # Run linting
make format        # Format code
make docker-up     # Start Docker services
make docker-down   # Stop Docker services
make migrate       # Create new migration
make db-upgrade    # Apply migrations
make run           # Run development server
```

### Database Migrations

Create a new migration:
```bash
make migrate msg="Add new table"
# or: alembic revision --autogenerate -m "Add new table"
```

Apply migrations:
```bash
make db-upgrade
# or: alembic upgrade head
```

Rollback:
```bash
make db-downgrade
# or: alembic downgrade -1
```

## Testing

Run all tests:
```bash
make test
```

Run specific test file:
```bash
pytest tests/test_mpp_reader.py -v
```

Run with coverage report:
```bash
pytest --cov=app --cov-report=html
```

## AWS Deployment

This application can be deployed to AWS using:
- AWS Lambda + API Gateway (serverless)
- ECS/Fargate (containerized)
- Elastic Beanstalk (managed platform)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
