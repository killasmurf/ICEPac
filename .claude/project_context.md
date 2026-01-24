# ICEPac Project Context

## Overview

ICEPac is a **modernization project** that involves:
1. A **legacy ColdFusion/Fusebox application** for cost estimation and project risk management
2. A **modern Python/FastAPI application** being built to replace/extend the legacy system

The modern FastAPI application reads and parses Microsoft Project files (.mpp, .mpx, .xml) and provides a REST API for accessing project data, serving as the foundation for modernizing the legacy ICEPAC system.

## Project Structure

```
icepac/
├── app/                    # Modern FastAPI application (NEW)
│   ├── main.py            # Application entry point
│   ├── models/            # Pydantic models
│   ├── routes/            # API route handlers (replacing Fusebox circuits)
│   ├── services/          # Business logic (replacing act_*.cfm files)
│   └── utils/             # Utility functions and validators
│
├── icepac/                # Legacy ColdFusion/Fusebox application (LEGACY)
│   │                      # 414 CFM files, Fusebox methodology
│   ├── Admin/             # Admin circuit (86 files)
│   ├── estimation/        # Estimation circuit (43 files)
│   ├── Reports/           # Reports circuit (194 files)
│   ├── Help/              # Help system circuit
│   ├── index.cfm          # Fusebox switch (router)
│   ├── app_global.cfm     # Application initialization
│   └── get_security_level.cfm  # Security handler
│
├── tests/                 # Test suite
├── docs/                  # Documentation
├── resources/             # Static resources
├── .claude/               # Claude Code configuration
├── requirements.txt       # Python dependencies
├── requirements-dev.txt   # Development dependencies
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
│
└── Documentation:
    ├── LEGACY_ICEPAC_ANALYSIS.md      # Comprehensive legacy analysis
    ├── FUSEBOX_FRAMEWORK_REFERENCE.md # Fusebox framework guide
    ├── SETUP.md                       # General setup
    └── WINDOWS_SETUP.md               # Windows-specific setup
```

## Technology Stack

### Modern Application (app/)
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Project File Parser**: MPXJ (Java library via JPype1)
- **ORM**: SQLAlchemy (planned)
- **Validation**: Pydantic models
- **Cloud Platform**: AWS (Lambda, API Gateway, ECS/Fargate, or Elastic Beanstalk)
- **Containerization**: Docker
- **Testing**: pytest

### Legacy Application (icepac/)
- **Framework**: Fusebox 3.x/4.x (ColdFusion MVC)
- **Language**: ColdFusion (CFML)
- **Database**: SQL Server (primary), MySQL (compatibility)
- **Architecture**: Circuit-based (Admin, estimation, Reports, Help, Exports)
- **File Count**: 414 CFM files
- **Patterns**: act/dsp/qry file naming conventions

## Business Domain

**Primary Focus:** Cost Estimation & Project Risk Management

**Core Features:**
1. MS Project file integration (.mpp import)
2. Three-point estimation (Best/Likely/Worst)
3. Work Breakdown Structure (WBS) management
4. Resource and supplier libraries
5. Risk assessment and tracking
6. Approval workflows
7. Comprehensive reporting (194 report files!)
8. Basis of Estimate (BOE) documentation

**Target Users:**
- Cost Estimators
- Project Managers
- Approvers/Reviewers
- Finance/Accounting teams

**Industry:**
- Government contracting
- Consulting
- Projects requiring detailed cost justification

## Migration Strategy

### Fusebox → FastAPI Mapping

| Fusebox Concept | FastAPI Equivalent |
|-----------------|-------------------|
| Circuit (e.g., Admin/) | APIRouter module (admin.py) |
| Fuseaction | Route endpoint (@app.get) |
| act_*.cfm files | Route handler functions |
| dsp_*.cfm files | Jinja2 templates or JSON responses |
| qry_*.cfm files | SQLAlchemy queries / repositories |
| app_global.cfm | Middleware / dependency injection |
| get_security_level.cfm | OAuth2 / JWT dependencies |

### Recommended Migration Order

1. **Help Circuit** (~20 files) - Simplest, read-only
2. **Admin Circuit** (86 files) - Standard CRUD operations
3. **Estimation Circuit** (43 files) - Core business logic
4. **Reports Circuit** (194 files) - Most complex, consider microservice

## Key Features (Modern App)

### Phase 1: MS Project Integration (Current)
1. Upload and parse Microsoft Project files
2. Extract tasks, resources, and project metadata
3. REST API for project data access
4. AWS-ready with Docker support

### Phase 2: Core Estimation (Planned)
1. Three-point estimation API
2. WBS management endpoints
3. Resource/supplier APIs
4. Risk assessment endpoints

### Phase 3: Workflow & Reporting (Planned)
1. Approval workflow automation
2. Cost calculation services
3. Report generation API
4. Export functionality

## Development Workflow

1. **Local Development**: uvicorn with hot reload
2. **Testing**: pytest with coverage (>80% target)
3. **Code Quality**: Black, isort, flake8, pylint, mypy
4. **Containerization**: Docker for consistent environments
5. **CI/CD**: GitHub Actions for automated testing
6. **Deployment**: AWS (Lambda/ECS/Fargate)

## Important Dependencies

### Production
- **FastAPI**: Web framework
- **JPype1**: Java interop for MPXJ library
- **boto3**: AWS integration
- **pydantic**: Data validation
- **uvicorn**: ASGI server

### Development
- **pytest**: Testing framework
- **black**: Code formatting
- **flake8/pylint**: Linting
- **mypy**: Type checking
- **pre-commit**: Git hooks

## Database Schema (Legacy → Modern)

The legacy system has a sophisticated schema:
- **tblProjects**: Project master table
- **tblWBS**: Work Breakdown Structure
- **tblResourceAssignment**: Estimates and assignments
- **tblRisks**: Risk management
- **tblResource**: Resource library
- **tblSupplier**: Supplier database
- **tblUsers**: User management
- **Dynamic per-project databases**

Modern application will use SQLAlchemy ORM to model these tables.

## Current Status

### Modern Application (app/)
- ✅ Basic FastAPI structure
- ✅ Development environment setup
- ✅ Testing infrastructure
- ✅ Windows batch scripts for development
- ⏳ MPXJ integration (in progress)
- ⏳ Database models (planned)
- ⏳ Circuit migration (not started)

### Legacy Application (icepac/)
- ✅ Fully functional production system
- ✅ Comprehensive feature set
- ✅ Documented and analyzed
- ❌ Requires modernization

### Documentation
- ✅ Claude Code configuration
- ✅ Windows setup guides
- ✅ Legacy system analysis
- ✅ Fusebox framework reference
- ✅ Migration strategy documented

## Important Notes for Claude Code

1. **Dual Codebase**: Be aware of both legacy (icepac/) and modern (app/) code
2. **Fusebox Patterns**: When working with legacy code, follow Fusebox conventions
3. **Migration Focus**: New development should use FastAPI patterns
4. **Preserve Business Logic**: Legacy system has 20+ years of business rules
5. **Testing Critical**: Both legacy understanding and modern implementation need tests

## References

- **Legacy Analysis**: See `LEGACY_ICEPAC_ANALYSIS.md` for comprehensive analysis
- **Fusebox Guide**: See `FUSEBOX_FRAMEWORK_REFERENCE.md` for framework details
- **Setup**: See `WINDOWS_SETUP.md` for Windows-specific setup instructions
- **Tasks**: See `.claude/tasks.md` for development roadmap
