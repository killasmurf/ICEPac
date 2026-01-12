.PHONY: help install install-dev setup test lint format clean docker-up docker-down migrate db-upgrade db-downgrade

# Default target
help:
	@echo "ICEPac Development Commands"
	@echo "============================"
	@echo "install          - Install production dependencies"
	@echo "install-dev      - Install development dependencies"
	@echo "setup           - Setup environment (create .env, install deps)"
	@echo "test            - Run tests with coverage"
	@echo "lint            - Run code linting"
	@echo "format          - Format code with black"
	@echo "clean           - Clean up cache and temp files"
	@echo "docker-up       - Start Docker services"
	@echo "docker-down     - Stop Docker services"
	@echo "migrate         - Create new database migration"
	@echo "db-upgrade      - Apply database migrations"
	@echo "db-downgrade    - Rollback last migration"
	@echo "run             - Run development server"

# Installation
install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements.txt -r requirements-dev.txt

setup:
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env file"; fi
	$(MAKE) install-dev

# Testing
test:
	pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html

test-fast:
	pytest tests/ -v -x

# Code Quality
lint:
	flake8 app tests
	mypy app

format:
	black app tests
	isort app tests

# Cleaning
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache .coverage htmlcov .mypy_cache

# Docker
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f app

docker-rebuild:
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

# Database
migrate:
	alembic revision --autogenerate -m "$(msg)"

db-upgrade:
	alembic upgrade head

db-downgrade:
	alembic downgrade -1

db-reset:
	alembic downgrade base
	alembic upgrade head

# Development
run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run-prod:
	uvicorn app.main:app --host 0.0.0.0 --port 8000

# All checks before commit
pre-commit: format lint test
	@echo "All checks passed!"
