# ICEPac

Microsoft Project File Reader Web API

## Description

icepac is a Python-based web application that reads and parses Microsoft Project files (.mpp, .mpx, .xml) and provides a REST API for accessing project data. Built with FastAPI and designed for deployment on AWS.

## Features

- 📁 Upload and parse Microsoft Project files
- 🔄 Extract tasks, resources, and project metadata
- ☁️ S3 integration for persistent file storage
- 🚀 FastAPI-based REST API
- 🐳 Docker support with LocalStack for local development
- 🧪 Comprehensive test coverage

## Prerequisites

- Python 3.11+
- Java Runtime Environment (for MPXJ library)
- Docker (optional, for containerized deployment)
- AWS Account (for cloud deployment)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/icepac.git
cd icepac
```

2. Create a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Download MPXJ JAR file:
   - Visit https://mpxj.org/
   - Download the latest version
   - Place the JAR file in the project root

5. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Usage

### Development Server (with LocalStack)

The easiest way to run locally with S3 support is using Docker Compose with LocalStack:

```bash
# Start all services (app + LocalStack for S3)
docker-compose up --build

# The API will be available at http://localhost:8000
# LocalStack S3 will be available at http://localhost:4566
```

### Development Server (without S3)

For basic development without S3:

```bash
uvicorn app.main:app --reload
```

### API Documentation

Interactive API docs: `http://localhost:8000/docs`

## API Endpoints

### Health & Info
- `GET /health` - Health check

### Project Management
- `POST /api/v1/upload` - Upload and parse a project file
  - Stores file in S3 and returns parsed data
  - Optional `user_id` query param for file organization

- `GET /api/v1/projects` - List all uploaded projects
  - Optional `prefix` and `max_files` query params

- `GET /api/v1/projects/{project_id}` - Get project by ID
  - Downloads from S3 and re-parses the file

- `DELETE /api/v1/projects/{project_id}` - Delete a project

- `GET /api/v1/projects/{project_id}/download-url` - Get presigned download URL
  - Optional `expires_in` param (default 3600 seconds)

### Example: Upload a Project File

```bash
curl -X POST "http://localhost:8000/api/v1/upload" \
  -F "file=@my-project.mpp"
```

Response:
```json
{
  "status": "success",
  "filename": "my-project.mpp",
  "project_id": "projects/20240115_abc123_my-project.mpp",
  "storage": {
    "s3_key": "projects/20240115_abc123_my-project.mpp",
    "bucket": "icepac-uploads",
    "size_bytes": 524288
  },
  "data": {
    "project_name": "My Project",
    "start_date": "2024-01-15",
    "tasks": [...],
    "resources": [...]
  }
}
```

## AWS Configuration

### S3 Bucket Setup

1. Create an S3 bucket (e.g., `icepac-uploads`)
2. Configure IAM permissions for your application
3. Set environment variables:

```bash
AWS_REGION=us-east-1
S3_BUCKET_NAME=icepac-uploads
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Local Development with LocalStack

For local testing without AWS:

```bash
# Start LocalStack
docker-compose up localstack

# Configure app to use LocalStack
S3_ENDPOINT_URL=http://localhost:4566
```

## Testing

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/test_s3_storage.py -v
```

## Project Structure

```
icepac/
├── app/
│   ├── main.py              # FastAPI application entry
│   ├── routes/
│   │   └── project.py       # Project API endpoints
│   ├── services/
│   │   ├── mpp_reader.py    # MPP file parsing
│   │   └── s3_storage.py    # S3 storage operations
│   ├── models/
│   │   ├── project.py       # Project data models
│   │   └── storage.py       # Storage response models
│   └── utils/
│       └── validators.py    # Input validation
├── tests/
│   ├── test_mpp_reader.py
│   └── test_s3_storage.py
├── scripts/
│   └── init-localstack.sh   # LocalStack initialization
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## AWS Deployment Options

- **AWS Lambda + API Gateway** - Serverless deployment
- **ECS/Fargate** - Containerized deployment
- **Elastic Beanstalk** - Managed platform

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
