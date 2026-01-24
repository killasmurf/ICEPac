# ICEPac - Cost Estimation & Project Risk Management System

**Modern Python/FastAPI Modernization of Legacy ColdFusion Application**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Project Status](#project-status)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Architecture](#architecture)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

ICEPac is a comprehensive **cost estimation and project risk management system** being modernized from a legacy ColdFusion/Fusebox application to a modern Python/FastAPI backend with React frontend.

### What is ICEPac?

ICEPac helps organizations:
- **Estimate project costs** using three-point estimation (Best/Likely/Worst)
- **Manage project risks** with probability and severity assessments
- **Import MS Project files** (.mpp, .mpx, .xml)
- **Track resource assignments** and supplier costs
- **Generate comprehensive reports** (194 different reports!)
- **Manage approval workflows** for estimates
- **Maintain resource libraries** and cost databases

### Target Users

- Cost Estimators
- Project Managers
- Approvers/Reviewers
- Finance/Accounting Teams
- Government Contractors
- Consulting Firms

---

## Project Status

🚧 **Active Modernization in Progress**

This project is currently in the **Planning Phase** of a comprehensive modernization effort.

### Legacy System
- **Technology:** ColdFusion/Fusebox MVC Framework
- **Files:** 414 CFM files across 5 circuits
- **Database:** SQL Server / MySQL
- **Age:** Developed 2000-2008
- **Status:** Production, fully functional

### Modern System
- **Backend:** Python 3.11+ with FastAPI
- **Frontend:** React 18+ with TypeScript
- **Database:** PostgreSQL 15+
- **Cloud:** AWS (ECS/Fargate, RDS, S3)
- **Status:** Foundation in development

### Timeline
- **Planning:** ✅ Complete (2026-01-11)
- **Phase 0 (Foundation):** ⏳ Weeks 1-4
- **Phase 1-6 (Migration):** ⏳ Weeks 5-46
- **Phase 7 (Cutover):** ⏳ Weeks 47-52
- **Total Duration:** 52 weeks (12 months)

**See [MODERNIZATION_PLAN.md](MODERNIZATION_PLAN.md) for detailed timeline**

---

## Quick Start

### For Developers

**Windows:**
```cmd
git clone https://github.com/killasmurf/icepac.git
cd icepac
setup.bat
```

**Linux/Mac:**
```bash
git clone https://github.com/killasmurf/icepac.git
cd icepac
make install
```

### Running the Development Server

**Windows:**
```cmd
run.bat
```

**Linux/Mac:**
```bash
make run
# or
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` for API documentation.

### Running Tests

**Windows:**
```cmd
test.bat
```

**Linux/Mac:**
```bash
make test
# or
pytest
```

**See [WINDOWS_SETUP.md](WINDOWS_SETUP.md) or [SETUP.md](SETUP.md) for detailed setup instructions**

---

## Documentation

### 📚 Planning & Strategy
- **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - Business case and high-level overview
- **[MODERNIZATION_PLAN.md](MODERNIZATION_PLAN.md)** - Comprehensive 52-week migration plan
- **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Detailed task checklist

### 🔍 Legacy System Analysis
- **[LEGACY_ICEPAC_ANALYSIS.md](LEGACY_ICEPAC_ANALYSIS.md)** - Complete legacy codebase analysis
- **[FUSEBOX_FRAMEWORK_REFERENCE.md](FUSEBOX_FRAMEWORK_REFERENCE.md)** - Fusebox framework guide

### 🛠️ Setup & Development
- **[WINDOWS_SETUP.md](WINDOWS_SETUP.md)** - Windows-specific setup guide
- **[SETUP.md](SETUP.md)** - General setup guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[.claude/](claude/)** - Claude Code configuration

### 📖 Quick Reference
- **[.claude/quick_start.md](.claude/quick_start.md)** - Quick command reference
- **[.claude/tasks.md](.claude/tasks.md)** - Development tasks
- **[.claude/rules.md](.claude/rules.md)** - Coding standards

---

## Architecture

### Modern Application (app/)

```
app/
├── main.py                 # FastAPI application
├── routes/                 # API endpoints (circuits → routers)
│   ├── admin.py           # Admin circuit
│   ├── estimation.py      # Estimation circuit
│   ├── reports.py         # Reports circuit
│   └── help.py            # Help circuit
├── services/              # Business logic
├── repositories/          # Data access
├── models/
│   ├── database/          # SQLAlchemy models
│   └── schemas/           # Pydantic schemas
├── core/
│   ├── config.py         # Configuration
│   ├── security.py       # Authentication/authorization
│   └── database.py       # Database connection
└── utils/                # Utilities
```

### Legacy Application (icepac/)

```
icepac/
├── index.cfm              # Fusebox switch (router)
├── app_global.cfm         # Application initialization
├── Admin/                 # Admin circuit (86 files)
├── estimation/            # Estimation circuit (43 files)
├── Reports/               # Reports circuit (194 files!)
├── Help/                  # Help system
└── Exports/               # Export functionality
```

### Database Schema

**Core Tables:**
- `tblProjects` - Project master
- `tblWBS` - Work Breakdown Structure
- `tblResourceAssignment` - Estimates and assignments
- `tblRisks` - Risk management
- `tblResource` - Resource library
- `tblSupplier` - Supplier database
- `tblUsers` - User management
- Configuration tables (CostType, Region, etc.)

---

## Development

### Technology Stack

**Backend:**
- Python 3.11+
- FastAPI
- SQLAlchemy (ORM)
- Pydantic (validation)
- Alembic (migrations)
- Celery (async tasks)
- Redis (caching)
- MPXJ via JPype1 (MS Project parsing)

**Frontend:**
- React 18+
- TypeScript
- Material-UI or Ant Design
- React Query
- React Router

**Infrastructure:**
- AWS (ECS/Fargate, RDS, S3)
- Docker
- GitHub Actions (CI/CD)
- Terraform (IaC)

### Development Workflow

1. **Feature Development**
   - Create feature branch
   - Write code following standards
   - Write tests (80%+ coverage)
   - Run linters and formatters

2. **Testing**
   - Unit tests with pytest
   - Integration tests
   - Frontend tests with Vitest

3. **Code Quality**
   - Black for formatting
   - isort for imports
   - flake8, pylint for linting
   - mypy for type checking

4. **Pull Request**
   - Create PR with description
   - Pass CI/CD checks
   - Code review
   - Merge to main

### Available Commands

**Windows:**
```cmd
setup.bat       # Initial setup
run.bat         # Start server
test.bat        # Run tests
format.bat      # Format code
lint.bat        # Run linters
```

**Linux/Mac:**
```bash
make install    # Initial setup
make run        # Start server
make test       # Run tests
make format     # Format code
make lint       # Run linters
```

---

## Features

### Current (Modern App)
- ✅ FastAPI application structure
- ✅ Development environment setup
- ✅ Testing infrastructure
- ✅ CI/CD pipeline
- ⏳ MS Project file parsing (in progress)

### Planned (Migration)

**Phase 1: Help System** (Weeks 5-7)
- Help topic management
- Search functionality

**Phase 2: Administration** (Weeks 8-15)
- User management with RBAC
- Resource library
- Supplier management
- Configuration tables

**Phase 3: MS Project Integration** (Weeks 8-13)
- File upload (.mpp, .mpx, .xml)
- Task extraction
- WBS import

**Phase 4: Estimation** (Weeks 16-27)
- Three-point estimation
- Resource assignments
- Risk management
- Approval workflows

**Phase 5: Reporting** (Weeks 28-43)
- Cost control reports
- Basis of Estimate (BOE)
- Audit reports
- Export formats (PDF, Excel, Word, CSV)

**Phase 6: Final Features** (Weeks 44-46)
- Exports
- Integration
- Polish

---

## API Endpoints (Planned)

### Authentication
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

### Projects
```
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{id}
PUT    /api/v1/projects/{id}
DELETE /api/v1/projects/{id}
POST   /api/v1/projects/upload
```

### Estimation
```
GET    /api/v1/projects/{id}/tasks
POST   /api/v1/projects/{id}/tasks/{taskId}/assignments
GET    /api/v1/projects/{id}/estimates
POST   /api/v1/projects/{id}/estimates/{id}/approve
```

### Reports
```
GET    /api/v1/reports/templates
POST   /api/v1/reports/generate
GET    /api/v1/reports/{id}/download
POST   /api/v1/reports/cost-control
POST   /api/v1/reports/boe
```

**Full API documentation:** `http://localhost:8000/docs`

---

## Contributing

<<<<<<< HEAD
We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Ensure tests pass
6. Submit a pull request

### Code Standards
- Follow PEP 8 (Python)
- Use type hints
- Write docstrings (Google style)
- Maintain 80%+ test coverage
- Run formatters and linters

---

## Support

### Documentation
- Check relevant documentation in the list above
- Review [.claude/quick_start.md](.claude/quick_start.md) for quick reference

### Issues
- Report bugs via GitHub Issues
- Include steps to reproduce
- Provide system information

### Questions
- Review existing documentation first
- Check closed issues
- Open a new issue with question tag

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Acknowledgments

- **Original System:** Developed 2000-2008 in ColdFusion/Fusebox
- **Modernization:** Planned and documented 2026-01
- **Technology:** FastAPI, React, PostgreSQL, AWS
- **Methodology:** Agile, Strangler Fig pattern

---

## Project Statistics

- **Legacy Code:** 414 ColdFusion files
- **Estimated Migration:** 52 weeks
- **Team Size:** 7-9 people
- **Target Coverage:** 80%+
- **Expected ROI:** Break-even in 24 months

---

**Last Updated:** 2026-01-11
**Status:** Planning Complete, Development Starting Soon
**Maintained By:** Development Team

---

## Quick Links

- [GitHub Repository](https://github.com/killasmurf/icepac)
- [API Documentation](http://localhost:8000/docs) (when running)
- [Modernization Plan](MODERNIZATION_PLAN.md)
- [Executive Summary](EXECUTIVE_SUMMARY.md)
=======
Contributions are welcome! Please feel free to submit a Pull Request.
>>>>>>> 5c1a81a3f8c35e2b5304f2886c15a3e97a56b34a
