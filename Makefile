.PHONY: help install test lint format clean run docker-build docker-run

help:
	@echo "ICEPac Development Commands"
	@echo "============================"
	@echo "install       - Install dependencies"
	@echo "install-dev   - Install development dependencies"
	@echo "test          - Run tests with coverage"
	@echo "test-unit     - Run unit tests only"
	@echo "test-integration - Run integration tests only"
	@echo "lint          - Run linters"
	@echo "format        - Format code with black"
	@echo "clean         - Remove build artifacts"
	@echo "run           - Run development server"
	@echo "docker-build  - Build Docker image"
	@echo "docker-run    - Run Docker container"

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements.txt
	pip install -r requirements-dev.txt

test:
	pytest

test-unit:
	pytest -m unit

test-integration:
	pytest -m integration

lint:
	flake8 app tests
	pylint app tests

format:
	black app tests
	isort app tests

clean:
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov
	rm -rf dist
	rm -rf build
	rm -rf *.egg-info
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

docker-build:
	docker build -t icepac:latest .

docker-run:
	docker run -p 8000:8000 icepac:latest
