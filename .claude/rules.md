# Claude Code Rules for ICEPac

## Code Style and Standards

### Python
- Follow PEP 8 style guide
- Use type hints for all function signatures
- Document all public functions with docstrings (Google style)
- Keep functions focused and under 50 lines when possible
- Use descriptive variable names

### FastAPI Specific
- Use dependency injection for shared resources
- Implement proper error handling with HTTP status codes
- Use Pydantic models for request/response validation
- Include OpenAPI documentation for all endpoints
- Follow REST API best practices

### Testing
- Write tests for all new features
- Aim for >80% code coverage
- Use pytest fixtures for common test setup
- Mock external dependencies (AWS, MPXJ)
- Include integration tests for API endpoints

## Project-Specific Guidelines

### File Organization
- Keep route handlers thin, move logic to services
- Place Pydantic models in `app/models/`
- Put business logic in `app/services/`
- Utilities and helpers go in `app/utils/`

### Error Handling
- Use FastAPI's HTTPException for API errors
- Log errors with appropriate severity levels
- Return meaningful error messages to clients
- Don't expose internal implementation details in errors

### Security
- Validate all user input
- Sanitize file uploads
- Use environment variables for sensitive config
- Implement rate limiting for API endpoints
- Follow OWASP security guidelines

### AWS Integration
- Use boto3 for AWS service interaction
- Implement proper AWS credentials management
- Design for serverless deployment (Lambda-compatible)
- Consider cold start optimization

### Documentation
- Keep README.md up to date
- Document all API endpoints in OpenAPI spec
- Add inline comments for complex logic
- Update project_context.md when architecture changes

## Git Workflow
- Write clear, descriptive commit messages
- Use feature branches for new development
- Keep commits focused and atomic
- Reference issues in commit messages when applicable

## Performance Considerations
- Optimize MPXJ parsing for large project files
- Implement async operations where beneficial
- Consider caching for frequently accessed data
- Monitor memory usage with large file uploads
