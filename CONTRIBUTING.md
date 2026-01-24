# Contributing to ICEPac

Thank you for your interest in contributing to ICEPac! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/icepac.git
   cd icepac
   ```
3. Set up your development environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```
4. Install pre-commit hooks:
   ```bash
   pre-commit install
   ```

## Development Workflow

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Run tests:
   ```bash
   pytest
   ```

4. Run linters:
   ```bash
   black app tests
   flake8 app tests
   ```

5. Commit your changes:
   ```bash
   git commit -m "Add feature: description"
   ```

6. Push to your fork and create a pull request

## Coding Standards

### Python Style
- Follow PEP 8
- Use Black for code formatting (line length: 88)
- Use isort for import sorting
- Add type hints to all functions
- Write docstrings for public functions (Google style)

### Testing
- Write tests for all new features
- Maintain >80% code coverage
- Use pytest fixtures for test setup
- Mark tests appropriately (unit, integration, slow, aws)

### Commit Messages
- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove)
- Keep the first line under 50 characters
- Add detailed description if needed

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Update CHANGELOG.md if applicable
4. Get approval from at least one maintainer
5. Squash commits if requested

## Code Review

All submissions require code review. We use GitHub pull requests for this purpose.

## Questions?

Feel free to open an issue for questions or discussion.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
