# icepac

Microsoft Project File Reader Web API

## Description

icepac is a Python-based web application that reads and parses Microsoft Project files (.mpp, .mpx, .xml) and provides a REST API for accessing project data. Built with FastAPI and designed for deployment on AWS.

## Features

- 📁 Upload and parse Microsoft Project files
- 🔄 Extract tasks, resources, and project metadata
- 🚀 FastAPI-based REST API
- ☁️ AWS-ready with Docker support
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
copy .env.example .env
# Edit .env with your configuration
```

## Usage

### Development Server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### API Documentation

Interactive API docs: `http://localhost:8000/docs`

### Docker

```bash
docker build -t icepac .
docker run -p 8000:8000 icepac
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/v1/upload` - Upload and parse a project file
- `GET /api/v1/projects/{project_id}` - Get project by ID

## Testing

```bash
pytest tests/
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