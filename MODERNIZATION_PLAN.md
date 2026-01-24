# ICEPac Modernization Plan

**Project:** ICEPac Legacy System Modernization
**Date:** 2026-01-11
**Version:** 1.0
**Status:** Planning Phase

---

## Executive Summary

This document outlines a comprehensive plan to modernize the ICEPac cost estimation and project risk management system from a ColdFusion/Fusebox architecture (414 files, circa 2000-2008) to a modern Python/FastAPI stack with a React frontend.

**Key Metrics:**
- **Legacy System:** 414 ColdFusion files across 5 circuits
- **Estimated Duration:** 12-18 months (phased approach)
- **Risk Level:** Medium (using gradual migration strategy)
- **Business Continuity:** Maintained throughout migration

**Approach:** Gradual, circuit-by-circuit migration with parallel systems

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Target Architecture](#2-target-architecture)
3. [Migration Strategy](#3-migration-strategy)
4. [Detailed Implementation Phases](#4-detailed-implementation-phases)
5. [Technical Requirements](#5-technical-requirements)
6. [Risk Management](#6-risk-management)
7. [Resource Requirements](#7-resource-requirements)
8. [Timeline & Milestones](#8-timeline--milestones)
9. [Success Criteria](#9-success-criteria)
10. [Appendices](#10-appendices)

---

## 1. Current State Assessment

### 1.1 Legacy System Overview

**Technology Stack:**
- ColdFusion CFML (Adobe/Macromedia)
- Fusebox 3.x/4.x MVC framework
- SQL Server (primary) / MySQL (compatibility)
- HTML/CSS/JavaScript (Morten's Tree Menu)
- CVS version control

**Architecture:**
```
Fusebox Circuits:
├── Admin (86 files)      - User/resource/supplier management
├── estimation (43 files) - Core estimation workflow
├── Reports (194 files)   - Comprehensive reporting
├── Help (~20 files)      - Help system
└── Exports (~10 files)   - Export functionality
Total: 414 CFM files
```

**Database Schema:**
- 20+ core tables (tblProjects, tblWBS, tblResourceAssignment, etc.)
- Dynamic per-project databases
- Complex relationships and stored procedures
- Sophisticated normalization

### 1.2 Business Value Analysis

**Strengths to Preserve:**
- ✅ Comprehensive three-point estimation workflow
- ✅ Robust approval process
- ✅ Extensive reporting capabilities (194 report files!)
- ✅ MS Project integration
- ✅ Risk management features
- ✅ 20+ years of business logic refinement

**Pain Points to Address:**
- ❌ Difficult to maintain (ColdFusion skills scarce)
- ❌ No API for integrations
- ❌ Limited scalability
- ❌ No mobile access
- ❌ Dated UI/UX
- ❌ Difficult to deploy (server-dependent)
- ❌ No modern CI/CD
- ❌ Security concerns (outdated framework)

### 1.3 Stakeholder Analysis

**Primary Stakeholders:**
- Cost Estimators (daily users)
- Project Managers (project oversight)
- Approvers/Reviewers (approval workflow)
- Finance/Accounting (reporting consumers)
- IT/DevOps (system maintenance)
- Management (ROI, compliance)

**Key Requirements:**
- Zero data loss
- Minimal workflow disruption
- Feature parity (at minimum)
- Improved performance
- Better reporting capabilities
- Mobile access
- API for integrations

---

## 2. Target Architecture

### 2.1 Modern Technology Stack

**Backend:**
```
FastAPI (Python 3.11+)
├── SQLAlchemy ORM (database abstraction)
├── Pydantic (data validation)
├── Alembic (database migrations)
├── Celery (async tasks, report generation)
├── Redis (caching, task queue)
├── JPype1 (MPXJ for MS Project files)
└── pytest (testing)
```

**Frontend:**
```
React 18+ with TypeScript
├── React Router (navigation)
├── React Query (data fetching)
├── Zustand or Redux Toolkit (state management)
├── Material-UI or Ant Design (component library)
├── Recharts or Victory (data visualization)
├── Formik + Yup (form handling)
└── Vitest + React Testing Library (testing)
```

**Infrastructure:**
```
AWS Cloud Platform
├── ECS/Fargate (container orchestration)
├── RDS (PostgreSQL database)
├── S3 (file storage for .mpp files)
├── CloudFront (CDN)
├── API Gateway (optional, for serverless)
├── Lambda (optional, for specific functions)
├── CloudWatch (monitoring/logging)
└── Cognito (authentication)
```

**DevOps:**
```
Development Pipeline
├── GitHub (version control)
├── GitHub Actions (CI/CD)
├── Docker (containerization)
├── Terraform (infrastructure as code)
├── SonarQube (code quality)
└── Snyk (security scanning)
```

### 2.2 Architectural Patterns

**Backend Architecture:**
```
app/
├── main.py                      # FastAPI application
├── core/
│   ├── config.py               # Configuration management
│   ├── security.py             # Authentication/authorization
│   ├── database.py             # Database connection
│   └── dependencies.py         # Dependency injection
├── models/
│   ├── database/               # SQLAlchemy models
│   │   ├── project.py
│   │   ├── wbs.py
│   │   ├── resource.py
│   │   └── ...
│   └── schemas/                # Pydantic schemas
│       ├── project.py
│       ├── estimate.py
│       └── ...
├── repositories/               # Data access layer
│   ├── project_repository.py
│   ├── estimate_repository.py
│   └── ...
├── services/                   # Business logic layer
│   ├── project_service.py
│   ├── estimate_service.py
│   ├── mpp_parser_service.py
│   └── ...
├── routes/                     # API endpoints (circuits → routers)
│   ├── admin.py               # Admin circuit
│   ├── estimation.py          # Estimation circuit
│   ├── reports.py             # Reports circuit
│   ├── help.py                # Help circuit
│   └── auth.py                # Authentication
├── utils/                      # Utilities
│   ├── calculations.py        # Estimation calculations
│   ├── validators.py          # Custom validators
│   └── formatters.py          # Data formatters
└── tasks/                      # Celery tasks
    ├── report_generation.py
    └── mpp_import.py
```

**Frontend Architecture:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── common/            # Reusable components
│   │   ├── admin/             # Admin module components
│   │   ├── estimation/        # Estimation module components
│   │   ├── reports/           # Reports module components
│   │   └── layout/            # Layout components
│   ├── pages/                 # Page components
│   │   ├── AdminPage.tsx
│   │   ├── EstimationPage.tsx
│   │   └── ReportsPage.tsx
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # API client services
│   │   ├── projectService.ts
│   │   └── estimateService.ts
│   ├── store/                 # State management
│   ├── types/                 # TypeScript types
│   ├── utils/                 # Utilities
│   └── App.tsx               # Main application
└── public/                    # Static assets
```

### 2.3 Database Migration Strategy

**Approach:** Schema compatibility layer

**Steps:**
1. Create SQLAlchemy models matching existing schema
2. Add new tables for modern features (versioning, audit trails)
3. Implement migration scripts (Alembic)
4. Maintain compatibility with legacy system during transition
5. Final cutover with data validation

**Key Considerations:**
- Preserve all existing data
- Maintain referential integrity
- Support dynamic per-project databases (or consolidate)
- Add proper indexing for performance
- Implement soft deletes for audit trail

---

## 3. Migration Strategy

### 3.1 Overall Approach: Strangler Fig Pattern

**Strategy:** Gradually replace legacy functionality while maintaining parallel systems

**Principles:**
1. **Incremental Migration:** One circuit at a time
2. **Parallel Running:** Legacy and modern systems coexist
3. **Feature Flags:** Toggle between old and new features
4. **Data Synchronization:** Shared database during transition
5. **Risk Mitigation:** Easy rollback at each phase

### 3.2 Circuit Migration Priority

**Phase Order (Low Risk → High Risk):**

1. **Help Circuit** (2-3 weeks)
   - Simplest, read-only
   - Low business impact
   - Learning opportunity for team
   - ~20 files

2. **Admin Circuit** (6-8 weeks)
   - Standard CRUD operations
   - Clear requirements
   - Essential for other circuits
   - 86 files

3. **MS Project Integration** (4-6 weeks)
   - Already partially built (app/)
   - Critical dependency
   - Can run in parallel with Admin

4. **Estimation Circuit** (10-12 weeks)
   - Core business logic
   - Complex workflows
   - Requires Admin and MPP
   - 43 files

5. **Reports Circuit** (12-16 weeks)
   - Most complex (194 files!)
   - Consider microservice
   - Can be last (legacy can remain)

6. **Exports Circuit** (2-3 weeks)
   - Support for Reports
   - Relatively simple
   - ~10 files

### 3.3 Coexistence Strategy

**Dual System Support:**

```
                    ┌─────────────────┐
                    │   Shared DB     │
                    └────────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
    ┌─────────▼────────┐      ┌──────────▼─────────┐
    │  Legacy System   │      │  Modern System     │
    │  (ColdFusion)    │      │  (FastAPI)         │
    └─────────┬────────┘      └──────────┬─────────┘
              │                           │
              │                           │
    ┌─────────▼────────┐      ┌──────────▼─────────┐
    │  Legacy UI       │      │  React UI          │
    │  (CFM templates) │      │  (SPA)             │
    └──────────────────┘      └────────────────────┘

              Feature Flags Control Routing
```

**Routing Mechanism:**
- User preference setting (opt-in to new features)
- Feature flags per circuit
- A/B testing capability
- Gradual rollout by user group

---

## 4. Detailed Implementation Phases

### Phase 0: Foundation (Weeks 1-4)

**Objectives:**
- Set up development infrastructure
- Establish CI/CD pipeline
- Create base application structure
- Set up database connectivity

**Deliverables:**

**Week 1-2: Infrastructure Setup**
- [ ] Set up GitHub repository structure
- [ ] Configure development, staging, production environments
- [ ] Set up AWS infrastructure (VPC, RDS, S3, etc.)
- [ ] Configure Docker containers
- [ ] Establish CI/CD pipeline with GitHub Actions
- [ ] Set up monitoring (CloudWatch, logging)

**Week 3-4: Application Foundation**
- [ ] Create FastAPI application skeleton
- [ ] Implement authentication/authorization framework
- [ ] Set up database connection with SQLAlchemy
- [ ] Create base Pydantic models
- [ ] Implement error handling middleware
- [ ] Set up Alembic for migrations
- [ ] Configure Celery for async tasks
- [ ] Set up Redis for caching
- [ ] Create React application skeleton
- [ ] Implement API client layer
- [ ] Set up routing and layout

**Acceptance Criteria:**
- ✅ All environments provisioned
- ✅ CI/CD pipeline running
- ✅ "Hello World" API endpoint deployed
- ✅ Database connectivity verified
- ✅ React app renders basic UI
- ✅ Authentication flow works

---

### Phase 1: Help Circuit Migration (Weeks 5-7)

**Objectives:**
- Migrate simplest circuit first
- Establish migration patterns
- Train team on process
- Validate architecture decisions

**Legacy Analysis:**
- ~20 CFM files
- Read-only operations
- Help topics stored in tblHelp, tblHelpDescr
- Search functionality
- Topic categorization

**Implementation Tasks:**

**Week 5: Database & Models**
- [ ] Create SQLAlchemy models for tblHelp, tblHelpDescr
- [ ] Create Pydantic schemas (HelpTopic, HelpCategory)
- [ ] Implement help repository (data access)
- [ ] Write unit tests for repository
- [ ] Create migration scripts

**Week 6: API & Services**
- [ ] Implement help service (business logic)
- [ ] Create FastAPI router (app/routes/help.py)
- [ ] Implement endpoints:
  - [ ] GET /help/topics - List all topics
  - [ ] GET /help/topics/{id} - Get topic details
  - [ ] GET /help/search?q={query} - Search help
  - [ ] GET /help/categories - List categories
- [ ] Write integration tests
- [ ] Document API (OpenAPI)

**Week 7: Frontend & Testing**
- [ ] Create React components (HelpPage, TopicList, SearchBar)
- [ ] Implement help search UI
- [ ] Add topic display with formatting
- [ ] Write frontend tests
- [ ] User acceptance testing
- [ ] Deploy to staging
- [ ] Feature flag: toggle between old/new help

**Acceptance Criteria:**
- ✅ All help topics migrated
- ✅ Search functionality works
- ✅ UI matches/improves legacy
- ✅ 80%+ test coverage
- ✅ Performance: <200ms response
- ✅ Users can toggle between old/new

**Migration Pattern Established:**
```
Legacy: ?fuseaction=help.displayTopic&topicID=123
Modern: GET /api/v1/help/topics/123
```

---

### Phase 2: Admin Circuit Migration (Weeks 8-15)

**Objectives:**
- Migrate user, resource, supplier management
- Implement CRUD patterns
- Establish security model
- Create reusable admin components

**Legacy Analysis:**
- 86 CFM files
- Multiple sub-modules:
  - User management (tblUsers, tblSecurity)
  - Resource library (tblResource)
  - Supplier management (tblSupplier)
  - Configuration tables (tblCostType, tblRegion, etc.)

**Implementation Tasks:**

**Weeks 8-9: Database Models & Security**
- [ ] Create SQLAlchemy models for all admin tables:
  - [ ] User, SecurityLevel, Security
  - [ ] Resource, Supplier
  - [ ] CostType, ExpType, Region, BusArea
  - [ ] EstimatingTechnique, RiskCategory
  - [ ] ProbabilityOccurrence, SeverityOccurrence
- [ ] Create Pydantic schemas for all entities
- [ ] Implement role-based access control (RBAC)
- [ ] Create admin repositories
- [ ] Write comprehensive unit tests

**Weeks 10-11: User Management API**
- [ ] Implement user service
- [ ] Create user management endpoints:
  - [ ] GET /admin/users - List users
  - [ ] GET /admin/users/{id} - Get user
  - [ ] POST /admin/users - Create user
  - [ ] PUT /admin/users/{id} - Update user
  - [ ] DELETE /admin/users/{id} - Delete user
  - [ ] PUT /admin/users/{id}/password - Change password
  - [ ] GET /admin/users/{id}/roles - Get user roles
  - [ ] PUT /admin/users/{id}/roles - Update roles
- [ ] Implement password hashing (bcrypt)
- [ ] Add audit logging
- [ ] Write integration tests

**Weeks 12-13: Resource & Supplier Management API**
- [ ] Implement resource service
- [ ] Create resource endpoints (CRUD)
- [ ] Implement supplier service
- [ ] Create supplier endpoints (CRUD)
- [ ] Implement configuration table endpoints:
  - [ ] Cost types, Expense types
  - [ ] Regions, Business areas
  - [ ] Estimating techniques
  - [ ] Risk categories, Probability/Severity levels
- [ ] Write integration tests

**Weeks 14-15: Frontend & UAT**
- [ ] Create React admin components:
  - [ ] UserManagement (list, create, edit, delete)
  - [ ] ResourceLibrary (list, create, edit)
  - [ ] SupplierManagement (list, create, edit)
  - [ ] ConfigurationTables (generic CRUD component)
- [ ] Implement data grids with sorting/filtering
- [ ] Add form validation
- [ ] Implement permission-based UI rendering
- [ ] Write frontend tests
- [ ] User acceptance testing
- [ ] Deploy to staging
- [ ] Feature flag: admin circuit toggle

**Acceptance Criteria:**
- ✅ All admin functions migrated
- ✅ RBAC working correctly
- ✅ UI improves on legacy
- ✅ 80%+ test coverage
- ✅ Audit logging in place
- ✅ Performance: <300ms for most operations

**Key Endpoints:**
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/admin/users
POST   /api/v1/admin/users
GET    /api/v1/admin/users/{id}
PUT    /api/v1/admin/users/{id}
DELETE /api/v1/admin/users/{id}
GET    /api/v1/admin/resources
POST   /api/v1/admin/resources
... (similar for suppliers, config tables)
```

---

### Phase 3: MS Project Integration (Weeks 8-13, Parallel with Phase 2)

**Objectives:**
- Complete MPP file parsing
- Support .mpp, .mpx, .xml formats
- Extract tasks, WBS, resources
- Store in database

**Implementation Tasks:**

**Weeks 8-9: MPXJ Integration**
- [ ] Complete MPXJ library integration (JPype1)
- [ ] Implement MPP parser service
- [ ] Support all formats (.mpp, .mpx, .xml)
- [ ] Extract:
  - [ ] Project metadata
  - [ ] Tasks with UniqueIDs
  - [ ] WBS codes and hierarchy
  - [ ] Schedule dates (start, finish, baseline)
  - [ ] Resource assignments (preliminary)
- [ ] Write comprehensive tests with sample files

**Weeks 10-11: Upload & Processing**
- [ ] Implement file upload endpoint:
  - [ ] POST /api/v1/projects/upload
- [ ] S3 integration for file storage
- [ ] Async processing with Celery
- [ ] Progress tracking for large files
- [ ] Error handling for corrupt files
- [ ] Create project from MPP data:
  - [ ] Insert into tblProjects
  - [ ] Create dynamic project DB (or use main DB)
  - [ ] Insert tasks into tblWBS
- [ ] Write integration tests

**Weeks 12-13: Frontend & Testing**
- [ ] Create upload UI component
- [ ] Progress bar for upload/processing
- [ ] Error handling and user feedback
- [ ] Display parsed project data
- [ ] User acceptance testing
- [ ] Deploy to staging

**Acceptance Criteria:**
- ✅ Supports .mpp, .mpx, .xml
- ✅ Correctly parses all sample files
- ✅ Handles large files (100+ tasks)
- ✅ Async processing works
- ✅ Data correctly stored in DB
- ✅ 80%+ test coverage

**Key Endpoints:**
```
POST   /api/v1/projects/upload
GET    /api/v1/projects/{id}/import-status
GET    /api/v1/projects/{id}/tasks
```

---

### Phase 4: Estimation Circuit Migration (Weeks 16-27)

**Objectives:**
- Migrate core business logic
- Implement three-point estimation
- Resource assignment workflow
- Risk management
- Approval workflow

**Legacy Analysis:**
- 43 CFM files
- Core business logic
- Complex workflows
- Three-point estimation (Best/Likely/Worst)
- Multiple approval levels

**Implementation Tasks:**

**Weeks 16-17: Project Management**
- [ ] Create SQLAlchemy models:
  - [ ] Project, WBS (if not done)
  - [ ] ResourceAssignment
  - [ ] Risk
- [ ] Implement project service
- [ ] Create project endpoints:
  - [ ] GET /projects - List projects
  - [ ] GET /projects/{id} - Get project
  - [ ] POST /projects - Create project
  - [ ] PUT /projects/{id} - Update project
  - [ ] DELETE /projects/{id} - Archive project
  - [ ] GET /projects/{id}/wbs - Get WBS structure
- [ ] Write tests

**Weeks 18-20: WBS & Task Management**
- [ ] Implement WBS service
- [ ] Create WBS endpoints:
  - [ ] GET /projects/{id}/tasks - List tasks
  - [ ] GET /projects/{id}/tasks/{taskId} - Get task
  - [ ] POST /projects/{id}/tasks - Create task
  - [ ] PUT /projects/{id}/tasks/{taskId} - Update task
  - [ ] DELETE /projects/{id}/tasks/{taskId} - Delete task
  - [ ] GET /projects/{id}/tasks/{taskId}/hierarchy - Get task hierarchy
- [ ] Implement WBS code generation
- [ ] Handle schedule dates, baselines
- [ ] Write tests

**Weeks 21-22: Resource Assignment & Estimation**
- [ ] Implement resource assignment service
- [ ] Implement estimation calculations:
  - [ ] Three-point estimate (Best/Likely/Worst)
  - [ ] PERT calculation: (Best + 4*Likely + Worst) / 6
  - [ ] Standard deviation: (Worst - Best) / 6
  - [ ] Confidence intervals
- [ ] Create resource assignment endpoints:
  - [ ] GET /projects/{id}/tasks/{taskId}/assignments
  - [ ] POST /projects/{id}/tasks/{taskId}/assignments
  - [ ] PUT /projects/{id}/tasks/{taskId}/assignments/{assignmentId}
  - [ ] DELETE /projects/{id}/tasks/{taskId}/assignments/{assignmentId}
- [ ] Support:
  - [ ] Duty percentage
  - [ ] AII percentage
  - [ ] Import content percentage
  - [ ] Supplier assignment
  - [ ] Cost type, Region, Business area
  - [ ] Estimating technique
- [ ] Write tests

**Weeks 23-24: Risk Management**
- [ ] Implement risk service
- [ ] Create risk endpoints:
  - [ ] GET /projects/{id}/tasks/{taskId}/risks
  - [ ] POST /projects/{id}/tasks/{taskId}/risks
  - [ ] PUT /projects/{id}/tasks/{taskId}/risks/{riskId}
  - [ ] DELETE /projects/{id}/tasks/{taskId}/risks/{riskId}
- [ ] Implement risk calculations:
  - [ ] Risk cost = Probability × Severity × Impact
  - [ ] Aggregate risk at WBS levels
- [ ] Support:
  - [ ] Risk categorization
  - [ ] Probability/Severity matrix
  - [ ] Mitigation plans
- [ ] Write tests

**Weeks 25-26: Approval Workflow**
- [ ] Implement approval workflow service
- [ ] Create workflow endpoints:
  - [ ] POST /projects/{id}/estimates/submit - Submit for approval
  - [ ] GET /projects/{id}/estimates/pending - Get pending approvals
  - [ ] POST /projects/{id}/estimates/{estimateId}/approve - Approve
  - [ ] POST /projects/{id}/estimates/{estimateId}/reject - Reject
  - [ ] GET /projects/{id}/estimates/history - Get approval history
- [ ] Implement state machine (Draft → Submitted → Approved/Rejected)
- [ ] Email notifications
- [ ] Revision tracking
- [ ] Write tests

**Week 27: Frontend & UAT**
- [ ] Create estimation UI components:
  - [ ] ProjectList, ProjectDetail
  - [ ] WBSTree (hierarchical task view)
  - [ ] TaskDetail
  - [ ] ResourceAssignmentForm (three-point estimation)
  - [ ] RiskAssessment
  - [ ] ApprovalWorkflow
- [ ] Implement drag-and-drop for task hierarchy
- [ ] Add calculation previews
- [ ] Implement approval notifications
- [ ] Write frontend tests
- [ ] User acceptance testing
- [ ] Deploy to staging
- [ ] Feature flag: estimation circuit toggle

**Acceptance Criteria:**
- ✅ Three-point estimation works correctly
- ✅ Calculations match legacy formulas
- ✅ Approval workflow functional
- ✅ Risk management complete
- ✅ UI improves usability
- ✅ 80%+ test coverage
- ✅ Performance: <500ms for complex calculations

**Key Endpoints:**
```
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{id}
GET    /api/v1/projects/{id}/tasks
POST   /api/v1/projects/{id}/tasks/{taskId}/assignments
GET    /api/v1/projects/{id}/estimates
POST   /api/v1/projects/{id}/estimates/{id}/approve
```

---

### Phase 5: Reports Circuit Migration (Weeks 28-43)

**Objectives:**
- Migrate 194 report files
- Implement report generation engine
- Support multiple output formats
- Optimize query performance

**Legacy Analysis:**
- 194 CFM files (largest circuit!)
- Multiple report types:
  - Cost control (by WBS, Resource, Supplier, EOC)
  - Basis of Estimate (BOE)
  - Audit reports
  - Risk assessment reports
  - Resource utilization
- Word document export

**Strategy:** Microservice or Async Processing

**Implementation Tasks:**

**Weeks 28-30: Report Engine Foundation**
- [ ] Design report generation architecture
- [ ] Decide: Microservice vs. Monolith with async tasks
- [ ] Implement report template system
- [ ] Create report repository (complex queries)
- [ ] Implement caching strategy (Redis)
- [ ] Set up Celery for async generation
- [ ] Write base report generation service

**Weeks 31-33: Cost Control Reports**
- [ ] Implement cost rollup calculations
- [ ] Create endpoints:
  - [ ] POST /reports/cost-by-wbs
  - [ ] POST /reports/cost-by-resource
  - [ ] POST /reports/cost-by-supplier
  - [ ] POST /reports/cost-by-eoc
  - [ ] POST /reports/cost-by-technique
- [ ] Support filters (date range, project, etc.)
- [ ] Optimize SQL queries (indexing, aggregation)
- [ ] Implement data export (Excel, CSV, PDF)
- [ ] Write tests

**Weeks 34-36: Basis of Estimate Reports**
- [ ] Implement BOE report generation
- [ ] Create endpoints:
  - [ ] POST /reports/boe-summary
  - [ ] POST /reports/boe-detailed
  - [ ] POST /reports/boe-by-wbs
- [ ] Include:
  - [ ] Estimation methodology
  - [ ] Assumptions
  - [ ] Risk analysis
  - [ ] Supporting documentation
- [ ] Generate formatted documents
- [ ] Write tests

**Weeks 37-39: Audit & Risk Reports**
- [ ] Implement audit trail reports
- [ ] Create endpoints:
  - [ ] POST /reports/estimator-activity
  - [ ] POST /reports/approver-activity
  - [ ] POST /reports/change-history
  - [ ] POST /reports/risk-assessment
  - [ ] POST /reports/risk-summary
- [ ] Write tests

**Weeks 40-41: Export Functionality**
- [ ] Implement document generation:
  - [ ] PDF (using ReportLab or WeasyPrint)
  - [ ] Excel (using openpyxl)
  - [ ] Word (using python-docx)
  - [ ] CSV
- [ ] Template system for formatting
- [ ] Branding/logo support
- [ ] Write tests

**Weeks 42-43: Frontend & UAT**
- [ ] Create report UI components:
  - [ ] ReportSelector
  - [ ] FilterPanel
  - [ ] ReportPreview
  - [ ] ExportOptions
- [ ] Implement report scheduling (optional)
- [ ] Add report history/favorites
- [ ] Write frontend tests
- [ ] User acceptance testing
- [ ] Performance optimization
- [ ] Deploy to staging
- [ ] Feature flag: reports circuit toggle

**Acceptance Criteria:**
- ✅ All 194 reports migrated or consolidated
- ✅ Performance: <2s for most reports
- ✅ Large reports (1000+ tasks) complete <10s
- ✅ Export formats work correctly
- ✅ Query optimization complete
- ✅ 80%+ test coverage

**Key Endpoints:**
```
GET    /api/v1/reports/templates
POST   /api/v1/reports/generate
GET    /api/v1/reports/{id}/status
GET    /api/v1/reports/{id}/download
POST   /api/v1/reports/cost-control
POST   /api/v1/reports/boe
```

---

### Phase 6: Exports Circuit & Final Features (Weeks 44-46)

**Objectives:**
- Complete export functionality
- Final integrations
- Polish and bug fixes

**Implementation Tasks:**

**Week 44: Exports Circuit**
- [ ] Migrate remaining export functionality
- [ ] Integrate with Reports circuit
- [ ] Test all export formats
- [ ] Write tests

**Week 45: Final Features & Polish**
- [ ] Implement any missing features
- [ ] UI/UX improvements based on feedback
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation updates

**Week 46: Integration Testing**
- [ ] End-to-end testing
- [ ] Cross-circuit integration tests
- [ ] Performance testing under load
- [ ] Security testing
- [ ] Bug fixes

**Acceptance Criteria:**
- ✅ All circuits migrated
- ✅ All integrations working
- ✅ No critical bugs
- ✅ Performance meets targets

---

### Phase 7: Cutover & Decommission (Weeks 47-52)

**Objectives:**
- Final data migration
- User training
- Cutover to new system
- Decommission legacy

**Implementation Tasks:**

**Weeks 47-48: Final Data Migration**
- [ ] Complete data validation
- [ ] Migrate any remaining data
- [ ] Reconciliation reports
- [ ] Backup legacy system

**Weeks 49-50: Training & Documentation**
- [ ] User training sessions
- [ ] Administrator training
- [ ] Documentation:
  - [ ] User guide
  - [ ] Administrator guide
  - [ ] API documentation
  - [ ] Deployment guide
  - [ ] Troubleshooting guide

**Week 51: Cutover**
- [ ] Final testing in production
- [ ] Monitor for issues
- [ ] Bug fixes
- [ ] Performance tuning

**Week 52: Decommission Legacy**
- [ ] Archive ColdFusion codebase
- [ ] Archive database backups
- [ ] Decommission CF server
- [ ] Update DNS/routing
- [ ] Post-implementation review

**Acceptance Criteria:**
- ✅ All users migrated
- ✅ Zero data loss
- ✅ System stable
- ✅ Legacy decommissioned

---

## 5. Technical Requirements

### 5.1 Development Environment

**Hardware:**
- Development machines: 16GB RAM minimum, 32GB recommended
- CI/CD runners: 8GB RAM minimum

**Software:**
- Python 3.11+
- Node.js 18+ LTS
- Docker Desktop
- PostgreSQL 15+ (local development)
- Redis 7+
- Git
- VS Code or PyCharm
- Postman or similar (API testing)

### 5.2 Production Infrastructure

**AWS Resources:**
```
Compute:
- ECS Cluster with Fargate (2-4 tasks minimum)
- Application Load Balancer
- Auto-scaling policies

Database:
- RDS PostgreSQL (Multi-AZ, db.r5.large minimum)
- 500GB storage minimum
- Automated backups (7-day retention)

Storage:
- S3 bucket for .mpp files
- S3 bucket for generated reports
- CloudFront CDN

Caching:
- ElastiCache Redis (cache.r5.large)

Networking:
- VPC with public/private subnets
- NAT Gateway
- Security groups

Monitoring:
- CloudWatch logs and metrics
- CloudWatch alarms
- X-Ray for tracing
```

**Estimated Monthly Cost:**
- Development: $500-800
- Staging: $800-1200
- Production: $2000-3000
- Total: ~$3500-5000/month

### 5.3 Security Requirements

**Authentication & Authorization:**
- OAuth 2.0 / JWT tokens
- Role-based access control (RBAC)
- Multi-factor authentication (MFA) optional
- Session management
- Password policies (complexity, expiration)

**Data Security:**
- Encryption at rest (RDS, S3)
- Encryption in transit (TLS 1.3)
- Secrets management (AWS Secrets Manager)
- Input validation
- SQL injection prevention
- XSS prevention
- CSRF protection

**Compliance:**
- OWASP Top 10 compliance
- SOC 2 considerations
- Data privacy regulations
- Audit logging
- Data retention policies

### 5.4 Performance Requirements

**Response Times:**
- API endpoints: <300ms (95th percentile)
- Report generation: <2s for standard reports
- Large reports (1000+ tasks): <10s
- Page load time: <2s
- Time to interactive: <3s

**Throughput:**
- Support 100 concurrent users
- 1000 API requests/minute
- 50 concurrent report generations

**Availability:**
- 99.5% uptime (production)
- Scheduled maintenance windows

**Scalability:**
- Horizontal scaling for API
- Vertical scaling for database
- Async processing for reports

---

## 6. Risk Management

### 6.1 Risk Register

| Risk ID | Risk Description | Impact | Probability | Mitigation Strategy |
|---------|-----------------|--------|-------------|---------------------|
| R1 | Data loss during migration | Critical | Low | • Comprehensive backups<br>• Data validation scripts<br>• Parallel running period |
| R2 | Business logic gaps | High | Medium | • Thorough legacy analysis<br>• User involvement<br>• Extensive testing |
| R3 | Performance degradation | High | Medium | • Load testing<br>• Query optimization<br>• Caching strategy |
| R4 | User resistance | Medium | Medium | • Change management<br>• Training<br>• UI/UX focus |
| R5 | Timeline overruns | Medium | High | • Phased approach<br>• Buffer time<br>• Scope management |
| R6 | Team skill gaps | Medium | Medium | • Training<br>• Pair programming<br>• External expertise |
| R7 | Integration issues | Medium | Medium | • Early integration testing<br>• API contracts<br>• Mocking |
| R8 | Security vulnerabilities | Critical | Low | • Security reviews<br>• Penetration testing<br>• OWASP compliance |
| R9 | Cost overruns | Medium | Medium | • Detailed estimates<br>• Regular reviews<br>• Contingency budget |
| R10 | Incomplete requirements | High | Medium | • Legacy system analysis<br>• User stories<br>• Prototyping |

### 6.2 Rollback Strategy

**Per Phase Rollback:**
- Feature flags allow instant disable of new features
- Legacy circuit remains functional
- Database compatible with both systems
- DNS/routing can revert quickly

**Emergency Rollback Procedure:**
1. Disable feature flags
2. Route traffic to legacy system
3. Investigate issues
4. Fix and redeploy
5. Gradual re-enable

**Data Rollback:**
- Not recommended (data integrity issues)
- Instead: Fix forward
- Database backups for catastrophic failure

---

## 7. Resource Requirements

### 7.1 Team Structure

**Core Team:**

**Backend Team (2-3 developers):**
- Senior Python/FastAPI developer (Tech Lead)
- Mid-level Python developer
- Junior Python developer (optional)

**Frontend Team (2 developers):**
- Senior React/TypeScript developer
- Mid-level React developer

**DevOps Engineer (1):**
- AWS infrastructure
- CI/CD pipeline
- Monitoring

**QA Engineer (1):**
- Test planning
- Automated testing
- UAT coordination

**Business Analyst (1, part-time):**
- Requirements gathering
- User stories
- Acceptance criteria

**Project Manager (1, part-time):**
- Timeline management
- Stakeholder communication
- Risk management

**Total Team Size:** 7-9 people

### 7.2 Skills Required

**Must Have:**
- Python 3.11+ (FastAPI, SQLAlchemy)
- React 18+ with TypeScript
- RESTful API design
- PostgreSQL / SQL
- Docker & containerization
- AWS (ECS, RDS, S3)
- Git version control
- Agile/Scrum

**Nice to Have:**
- ColdFusion (for legacy understanding)
- MS Project file formats
- Cost estimation domain knowledge
- Report generation
- Security best practices

### 7.3 Training Needs

**For Development Team:**
- FastAPI framework (1 week)
- React/TypeScript advanced (1 week)
- AWS services (1 week)
- Legacy system walkthrough (2 weeks)
- Domain knowledge (ongoing)

**For End Users:**
- New system training (2 hours per user group)
- Admin training (4 hours)
- Change management sessions

---

## 8. Timeline & Milestones

### 8.1 Overall Timeline

**Total Duration:** 52 weeks (12 months)

```
Quarter 1 (Weeks 1-13):
├── Phase 0: Foundation (Weeks 1-4)
├── Phase 1: Help Circuit (Weeks 5-7)
├── Phase 2: Admin Circuit (Weeks 8-15, partial)
└── Phase 3: MS Project Integration (Weeks 8-13)

Quarter 2 (Weeks 14-26):
├── Phase 2: Admin Circuit (completion)
├── Phase 4: Estimation Circuit (Weeks 16-27, partial)

Quarter 3 (Weeks 27-39):
├── Phase 4: Estimation Circuit (completion)
└── Phase 5: Reports Circuit (Weeks 28-43, partial)

Quarter 4 (Weeks 40-52):
├── Phase 5: Reports Circuit (completion)
├── Phase 6: Exports & Final Features (Weeks 44-46)
└── Phase 7: Cutover & Decommission (Weeks 47-52)
```

### 8.2 Key Milestones

| Milestone | Week | Deliverable |
|-----------|------|-------------|
| M1: Infrastructure Ready | 4 | Dev/staging/prod environments live |
| M2: Help Circuit Live | 7 | First circuit migrated and tested |
| M3: Admin Circuit Live | 15 | User/resource management migrated |
| M4: MPP Integration Live | 13 | MS Project import working |
| M5: Estimation Core Live | 27 | Three-point estimation functional |
| M6: Reports Live | 43 | All reports migrated |
| M7: System Complete | 46 | All features migrated |
| M8: Go-Live | 51 | Production cutover |
| M9: Legacy Decommissioned | 52 | Old system retired |

### 8.3 Dependencies

**Critical Path:**
1. Foundation → All other phases
2. Admin Circuit → Estimation Circuit
3. MS Project Integration → Estimation Circuit
4. Estimation Circuit → Reports Circuit

**Parallel Work:**
- Admin Circuit & MS Project Integration (Weeks 8-13)
- Frontend & Backend development (all phases)

---

## 9. Success Criteria

### 9.1 Technical Success Metrics

**Functionality:**
- ✅ 100% feature parity with legacy system
- ✅ All 414 CFM files replaced
- ✅ Zero data loss
- ✅ All integrations working

**Quality:**
- ✅ 80%+ code coverage
- ✅ Zero critical bugs in production
- ✅ <10 high-priority bugs in first month
- ✅ Security scan passes (OWASP Top 10)

**Performance:**
- ✅ API response times <300ms (95th percentile)
- ✅ Page load times <2s
- ✅ Report generation <10s for large reports
- ✅ Support 100 concurrent users

**Availability:**
- ✅ 99.5% uptime
- ✅ <4 hours unplanned downtime per month

### 9.2 Business Success Metrics

**User Adoption:**
- ✅ 100% of users migrated
- ✅ <5% rollback requests
- ✅ User satisfaction >80%

**Efficiency:**
- ✅ 20% reduction in time to create estimates
- ✅ 30% reduction in report generation time
- ✅ 50% reduction in maintenance costs

**ROI:**
- ✅ Break-even within 18 months
- ✅ 40% cost savings over 3 years

### 9.3 Project Success Metrics

**Timeline:**
- ✅ Delivered within 10% of estimated timeline
- ✅ All phases completed

**Budget:**
- ✅ Within 10% of budget
- ✅ No scope creep >20%

**Team:**
- ✅ Team satisfaction >80%
- ✅ Knowledge transfer complete
- ✅ Documentation complete

---

## 10. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| BOE | Basis of Estimate - documentation explaining estimation methodology |
| Circuit | Fusebox term for a functional module (e.g., Admin, estimation) |
| EOC | Element of Cost - classification for resources/costs |
| Fuseaction | Fusebox routing parameter (format: circuit.action) |
| MPP | Microsoft Project file format (.mpp) |
| MPXJ | Java library for reading MS Project files |
| RBAC | Role-Based Access Control |
| WBS | Work Breakdown Structure - hierarchical decomposition of project work |

### Appendix B: Reference Documents

- [LEGACY_ICEPAC_ANALYSIS.md](LEGACY_ICEPAC_ANALYSIS.md) - Comprehensive legacy analysis
- [FUSEBOX_FRAMEWORK_REFERENCE.md](FUSEBOX_FRAMEWORK_REFERENCE.md) - Fusebox framework guide
- [SETUP.md](SETUP.md) - Development setup guide
- [WINDOWS_SETUP.md](WINDOWS_SETUP.md) - Windows-specific setup
- [.claude/project_context.md](.claude/project_context.md) - Project context
- [.claude/tasks.md](.claude/tasks.md) - Development tasks

### Appendix C: Decision Log

| Date | Decision | Rationale | Stakeholders |
|------|----------|-----------|--------------|
| 2026-01-11 | Use FastAPI instead of Django | Better async support, OpenAPI docs, performance | Tech team |
| 2026-01-11 | PostgreSQL over SQL Server | Better Python support, cost, AWS RDS compatibility | Tech team, Ops |
| 2026-01-11 | React over Vue/Angular | Team expertise, ecosystem, hiring pool | Tech team |
| 2026-01-11 | Gradual migration over rewrite | Risk mitigation, business continuity | Management, Users |
| 2026-01-11 | ECS/Fargate over Lambda | Better fit for long-running operations, no cold starts | DevOps, Tech team |

### Appendix D: Contact List

**Project Sponsor:**
- TBD

**Project Manager:**
- TBD

**Technical Lead:**
- TBD

**Business Owner:**
- TBD

**Key Stakeholders:**
- Cost Estimators Representative: TBD
- Project Managers Representative: TBD
- IT/DevOps: TBD

---

## Conclusion

This modernization plan provides a comprehensive roadmap for migrating ICEPac from a legacy ColdFusion/Fusebox system to a modern Python/FastAPI and React architecture. The phased, circuit-by-circuit approach minimizes risk while ensuring business continuity.

**Key Success Factors:**
1. **Gradual Migration** - Minimize disruption
2. **Parallel Systems** - Easy rollback
3. **User Involvement** - Ensure adoption
4. **Comprehensive Testing** - Maintain quality
5. **Documentation** - Knowledge preservation

**Next Steps:**
1. Review and approve this plan
2. Secure budget and resources
3. Assemble team
4. Begin Phase 0: Foundation

---

**Document Version:** 1.0
**Last Updated:** 2026-01-11
**Status:** Draft - Awaiting Approval
**Prepared By:** Claude Code (Sonnet 4.5)
