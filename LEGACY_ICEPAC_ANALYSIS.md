# ICEPAC Legacy Codebase Analysis

**Analysis Date:** 2026-01-11
**Location:** `c:\users\Adam Murphy\AI\icepac\icepac\`
**Technology:** ColdFusion (CFML)
**Framework:** Fusebox Methodology

## Executive Summary

ICEPAC is a mature ColdFusion-based collaborative cost estimation and project risk management system developed between 2000-2008 using the **Fusebox methodology**. Fusebox was a popular MVC framework for ColdFusion that emphasized code organization, reusability, and maintainability through standardized file naming and circuit-based architecture. The system manages the complete lifecycle of project cost estimation, including MS Project integration, three-point estimation, risk management, and comprehensive reporting.

---

## 1. Technology Stack

### Primary Technologies
- **ColdFusion (CFML)**: 414 CFM files
- **Version**: ICEPAC 2.0
- **Database**:
  - Microsoft SQL Server (primary)
  - MySQL (compatibility layer)
- **Frontend**: HTML, CSS, JavaScript (Morten's Tree Menu v2.3.0)
- **Version Control**: CVS (legacy)

### File Statistics
- 414 ColdFusion (.cfm) files
- 204 GIF images
- 20 JPG images
- 4 JavaScript files
- 3 CSS files
- 4 HTML files

---

## 2. Architecture & Design Patterns

### Fusebox Methodology

ICEPAC follows the **Fusebox framework**, a popular ColdFusion MVC architecture from the early 2000s. Fusebox introduced standardized patterns for organizing ColdFusion applications.

**Key Fusebox Concepts:**

1. **Fuseaction**: The core routing mechanism
   - URL parameter: `?fuseaction=circuit.action`
   - Example: `?fuseaction=admin.editUser`
   - Circuits represent functional modules
   - Actions are specific operations within a circuit

2. **File Naming Conventions:**
   - `act_*.cfm` - **Action files** (business logic, form processing)
   - `dsp_*.cfm` - **Display files** (UI rendering, view layer)
   - `qry_*.cfm` - **Query files** (database operations)
   - `fbx_*.cfm` - **Fusebox core files** (framework files)

3. **Application Structure:**
   - `index.cfm` - **Fusebox switch** (main router)
   - `app_global.cfm` - **Application globals** (session, variables)
   - Circuits as subdirectories (Admin/, estimation/, Reports/)
   - `FormURL2Attributes.cfm` - Fusebox utility for parameter handling

4. **Request Lifecycle:**
   ```
   User Request → index.cfm (Fusebox switch)
       ↓
   Parse fuseaction parameter
       ↓
   Route to appropriate circuit
       ↓
   Execute action files (act_*.cfm)
       ↓
   Query data (qry_*.cfm)
       ↓
   Render display (dsp_*.cfm)
       ↓
   Return HTML to browser
   ```

### Fusebox Circuit Structure

In Fusebox terminology, the subdirectories are called **circuits**. Each circuit is a self-contained module with its own actions, displays, and queries.

```
icepac/ (Root - Main circuit)
│
├── Admin/              86 files - Administration circuit
│   ├── act_*.cfm      Action handlers
│   ├── dsp_*.cfm      Display templates
│   ├── qry_*.cfm      Query components
│   └── Features: User management, Resource library,
│                 Supplier management, Configuration
│
├── estimation/         43 files - Estimation circuit
│   ├── act_*.cfm      Estimation actions
│   ├── dsp_*.cfm      Estimation displays
│   ├── qry_*.cfm      Estimation queries
│   └── Features: Resource assignment, Three-point estimation,
│                 Risk assessment, Approval workflows
│
├── Reports/           194 files - Reporting circuit
│   ├── act_*.cfm      Report generation actions
│   ├── dsp_*.cfm      Report displays
│   ├── qry_*.cfm      Report queries
│   └── Features: Cost control, BOE, Audit reports, Word exports
│
├── Help/              Help system circuit
├── images/            UI assets (not a circuit)
├── errors/            Error handling templates
├── Exports/           Export functionality circuit
│
└── Root level files:
    ├── index.cfm              Fusebox switch (router)
    ├── app_global.cfm         Application initialization
    ├── get_security_level.cfm Security handler
    ├── FormURL2Attributes.cfm Fusebox utility
    └── dsp_*.cfm, act_*.cfm   Root circuit actions/displays
```

### Fusebox Application Flow

```
User Request: ?fuseaction=admin.editUser
    ↓
index.cfm (Fusebox switch)
    ↓
Parse fuseaction → circuit="admin", action="editUser"
    ↓
app_global.cfm (Initialize session, load globals)
    ↓
get_security_level.cfm (Check user permissions)
    ↓
Route to circuit: Admin/
    ↓
Execute: Admin/act_editUser.cfm (business logic)
    ↓
Query: Admin/qry_getUser.cfm (database operations)
    ↓
Display: Admin/dsp_editUser.cfm (render UI)
    ↓
Return HTML to browser
```

### Fusebox Benefits (Historical Context)

1. **Standardization**: Consistent file naming and organization
2. **Modularity**: Circuits are self-contained and reusable
3. **Separation of Concerns**: Clear MVC separation
4. **Team Collaboration**: Multiple developers can work on different circuits
5. **Maintainability**: Easy to locate and modify code

### Fusebox Challenges

1. **File Proliferation**: Large applications have hundreds of files
2. **Performance**: Multiple file includes per request
3. **Learning Curve**: Framework-specific conventions
4. **Legacy**: Fusebox usage declined after 2010s with modern frameworks

---

## 3. Core Modules & Features

### A. Authentication & Security

**Files:**
- `act_login.cfm` - User authentication
- `get_security_level.cfm` - Dynamic role assignment (107 lines)
- `dsp_login.cfm` - Login interface

**Security Model:**
- **Admin (Ad)**: Full system access
- **Project Manager (Pr)**: Project-level control
- **Estimator (E)**: Estimation entry
- **Approver (Ap)**: Approval authority
- **View-only roles**: Read-only access

**Implementation:**
- Session-based authentication
- CF_ClientVariables for persistence
- Per-table security checks
- Audit logging via tblLog

### B. Administration Module (86 files)

**User Management:**
- Add/edit/delete users
- Role assignment
- Password management

**Resource Library:**
- Resource definitions (tblResource)
- EOC (Element of Cost) mapping
- Cost and unit tracking

**Supplier Management:**
- Supplier database (tblSupplier)
- Supplier categorization

**Configuration Tables:**
- Cost Types (tblCostType)
- Expense Types (tblExpType)
- Estimating Techniques (tblEstimatingTechnique)
- Business Areas (tblBus_Area)
- Regions (tblRegion)
- Expenditure Indicators (tblExpInd)
- Risk Categories (tblRiskCategory)
- Probability/Severity levels
- PMB Weights

### C. Estimation Module (43 files)

**Core Estimation Features:**

1. **Three-Point Estimation:**
   - Best Estimate
   - Likely Estimate
   - Worst Estimate

2. **Resource Assignment:**
   - Task-to-resource mapping
   - Multiple resources per task
   - Supplier assignment

3. **Tracking Metrics:**
   - Duty percentage
   - AII (Actual Import Implementation) percentage
   - Import content percentage
   - Contingency management

4. **WBS (Work Breakdown Structure):**
   - WBS code and title
   - Schedule dates (baseline, late dates)
   - Cost tracking
   - Requirements and assumptions
   - Estimate revision tracking

5. **Risk Management:**
   - Risk identification per WBS item
   - Risk categorization
   - Probability and severity assessment
   - Mitigation planning
   - Cost-based risk tracking

6. **Approval Workflow:**
   - Estimator submission
   - Approver review
   - Revision tracking
   - Approval date stamping

**Key Files:**
- `dsp_res_ass_entry.cfm` - Resource assignment interface (6,725 bytes)
- `dsp_risk_info.cfm` - Risk assessment
- `dsp_wbs_risk.cfm` - WBS-level risk management
- `act_create_project.cfm` - Project creation (9,173 bytes)

### D. Reporting Module (194 files!)

**Report Categories:**

1. **Cost Control Reports:**
   - By WBS
   - By Resource
   - By Supplier
   - By EOC (Element of Cost)
   - By Estimating Technique

2. **Basis of Estimate (BOE):**
   - Detailed estimation basis
   - Methodology documentation
   - Assumptions and constraints

3. **Audit Reports:**
   - Estimator activity
   - Approver activity
   - Change history

4. **Risk Reports:**
   - Risk assessment summaries
   - Risk categorization analysis
   - Probability/severity matrices

5. **Resource Utilization:**
   - Resource allocation
   - Supplier analysis

**Export Capabilities:**
- Word document generation (`act_downloadreport_word.cfm`)
- Dynamic report formatting
- Multiple report layouts

### E. Help System

**Features:**
- Dynamic help topics (tblHelp, tblHelpDescr)
- Help search functionality
- Help topic ordering
- Context-sensitive help
- Help administration interface

---

## 4. Database Schema

### Core Entity Relationship Model

```
┌──────────────┐
│  tblProjects │
│  (Projects)  │
└──────┬───────┘
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
┌──────────────┐            ┌──────────────┐
│    tblWBS    │            │  tblRisks    │
│    (Tasks)   │            │   (Risks)    │
└──────┬───────┘            └──────────────┘
       │
       ▼
┌───────────────────────┐
│ tblResourceAssignment │
│   (Assignments)       │
└───────────────────────┘
       │
       ├─────────────┬─────────────┐
       ▼             ▼             ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ tblResource│ │tblSupplier │ │tblCostType │
│ (Resources)│ │(Suppliers) │ │(Cost Types)│
└────────────┘ └────────────┘ └────────────┘
```

### Primary Tables

**tblProjects**
```sql
- ProjID (PK)
- ProjectName
- DatabaseName (dynamic project DB)
- ProjManager
- Archived (bit)
- Date fields (created, modified)
```

**tblWBS (Work Breakdown Structure)**
```sql
- TaskUniqueID (PK)
- ProjID (FK)
- WBS_code
- WBS_title
- ScheduleStart, ScheduleFinish
- BaselineStart, BaselineFinish
- LateStart, LateFinish
- Cost, BaselineCost
- Requirements, Assumptions
- Approver, ApproverDate
- EstimateRevision
- Risk indicators
```

**tblResourceAssignment**
```sql
- AssignmentID (PK)
- TaskUniqueID (FK)
- Resource_code (FK)
- BestEstimate, LikelyEstimate, WorstEstimate
- Duty (percentage)
- Import_ContentPct
- AIIPct (Actual Import Implementation)
- Supplier_code (FK)
- CostType_code (FK)
- Region_code (FK)
- BusArea_code (FK)
- EstimatingTechnique_code (FK)
```

**tblRisks**
```sql
- TaskUniqueID (FK)
- Risk_ID
- RiskCategory_code (FK)
- RiskCost
- ProbabilityOccurrence_code (FK)
- SeverityOccurrence_code (FK)
- MitigationPlan (text)
- DateIdentified
```

### Master/Reference Tables

**User & Security:**
- `tblUsers` - User accounts (UserID, Password, FName, SName)
- `tblSecurity` - Role assignments
- `tblSecurityLevel` - Role definitions

**Resources & Costs:**
- `tblResource` - Resource library (Resource_code, EOC, description, cost, units)
- `tblSupplier` - Supplier information
- `tblCostType` - Cost type definitions
- `tblEstimatingTechnique` - Estimation methodologies

**Classification:**
- `tblBus_Area` - Business area codes
- `tblRegion` - Geographic regions
- `tblExpType` / `tblExpInd` - Expense types and indicators

**Risk Management:**
- `tblRiskCategory` - Risk categories
- `tblProbabilityOccurrence` - Probability levels
- `tblSeverityOccurrence` - Severity levels

**Configuration:**
- `tblPMBWeight` - Project Management baseline weights
- `tblHelp` / `tblHelpDescr` - Help system content

**Audit:**
- `tblLog` - System audit trail

### Dynamic Per-Project Databases

When a project is created, ICEPAC creates a separate database:
- Database name: `ProjectName` (from tblProjects)
- Contains project-specific tables:
  - `ProjectName_Tasks`
  - `ProjectName_tblWBS`
  - `ProjectName_tblResourceAssignment`
  - etc.

---

## 5. Key Business Workflows

### Project Creation Workflow

```
1. Admin creates project
   └─> act_create_project.cfm
       ├─> Creates entry in tblProjects
       ├─> Creates dynamic project database
       ├─> Creates project-specific tables
       └─> Sets project manager

2. Import MS Project file
   └─> Upload .mpp file
       ├─> Parse MS Project data
       ├─> Populate ProjectName_Tasks
       └─> Create WBS structure

3. Configure project
   └─> Set up users, roles, approvers
```

### Estimation Workflow

```
1. Estimator selects WBS item
   └─> dsp_res_ass_entry.cfm

2. Create resource assignment
   ├─> Select resource from library
   ├─> Assign supplier (if applicable)
   ├─> Enter three-point estimate
   │   ├─> Best estimate
   │   ├─> Likely estimate
   │   └─> Worst estimate
   ├─> Set duty percentage
   ├─> Set AII percentage
   ├─> Select cost type, region, business area
   └─> Select estimating technique

3. Add risk assessment
   ├─> Identify risks
   ├─> Categorize risk
   ├─> Assess probability
   ├─> Assess severity
   ├─> Calculate risk cost
   └─> Document mitigation plan

4. Submit for approval
   └─> Approver reviews estimate
       ├─> Approve
       ├─> Reject (with comments)
       └─> Request revision
```

### Reporting Workflow

```
1. User selects report type
   └─> Navigate to Reports module

2. Configure report parameters
   ├─> Select project
   ├─> Select date range
   ├─> Select cost breakdown (WBS/Resource/Supplier/EOC)
   └─> Select output format

3. Generate report
   ├─> Query database
   ├─> Aggregate costs
   ├─> Apply calculations
   └─> Format output

4. Export (optional)
   └─> Word document download
```

---

## 6. Integration Points

### MS Project Integration

**Upload Process:**
- User uploads .mpp file
- System parses MS Project binary format
- Extracts:
  - Tasks with UniqueIDs
  - WBS codes and hierarchy
  - Schedule dates
  - Baseline information
  - Resource assignments (preliminary)
- Populates project database

**Sync Considerations:**
- One-way import (MS Project → ICEPAC)
- No automatic sync
- Manual re-import for updates

### Database Integration

**Configuration File:** `icepac.cfg`
```ini
database_source_email=
database_url=server67:333/icepac
database_path=C:\Program Files\sugarcrm-5.0.0c\htdocs\icepac
provider=mysql
datasource=icepac
datasourcedbname=icepac
datasourceusername=root
datasourcepwd=
logdatasourcename=icepacLog
```

**Database Providers:**
- SQL Server (primary, via icepac_tables.sql)
- MySQL (via icepac_tables.mysql.sql)
- Configurable DSN

### Export Integration

**Word Document Export:**
- Template-based generation
- Multiple report formats
- Formatted tables and charts
- `act_downloadreport_word.cfm` handler

---

## 7. Code Quality & Technical Debt

### Strengths

1. **Clear Separation of Concerns:**
   - act/dsp/qry pattern enforced
   - Modular structure

2. **Comprehensive Feature Set:**
   - 194 report files demonstrate depth
   - Well-thought-out estimation workflow

3. **Security Model:**
   - Role-based access control
   - Session management
   - Audit logging

4. **Database Design:**
   - Normalized schema
   - Appropriate use of foreign keys
   - Dynamic project databases for scalability

### Technical Debt

1. **Legacy Technology:**
   - ColdFusion is outdated (2000s-era)
   - Limited modern framework support
   - Difficult to find CF developers

2. **File Proliferation:**
   - 414+ files make maintenance challenging
   - Difficult to navigate
   - Code reuse could be improved

3. **Hardcoded Values:**
   - Configuration in icepac.cfg needs modernization
   - Some paths hardcoded in files

4. **Limited API:**
   - No REST API
   - Tight coupling between UI and business logic
   - Difficult to integrate with modern systems

5. **Testing:**
   - No visible unit tests
   - Manual testing required

6. **Documentation:**
   - Inline comments sparse
   - No architectural documentation
   - Help system exists but developer docs missing

---

## 8. Modernization Recommendations

### Fusebox → FastAPI Migration Strategy

Migrating from **Fusebox/ColdFusion** to **FastAPI/Python** requires careful mapping of architectural concepts:

**Fusebox Concept → FastAPI Equivalent:**
```
Fusebox Circuit         → FastAPI Router (APIRouter)
Fuseaction             → Route endpoint (@app.get, @app.post)
act_*.cfm files        → Route handler functions
dsp_*.cfm files        → Jinja2 templates or JSON responses
qry_*.cfm files        → SQLAlchemy queries / repository methods
app_global.cfm         → Dependency injection, middleware
get_security_level.cfm → FastAPI dependencies, OAuth2
FormURL2Attributes     → Pydantic models (request validation)
```

**Example Migration:**

**Fusebox (Old):**
```cfml
<!-- URL: ?fuseaction=admin.editUser&userID=123 -->
<!-- Admin/act_editUser.cfm -->
<cfquery name="getUser" datasource="icepac">
    SELECT * FROM tblUsers WHERE UserID = #userID#
</cfquery>
<cfinclude template="dsp_editUser.cfm">
```

**FastAPI (New):**
```python
# app/routes/admin.py
from fastapi import APIRouter, Depends
from app.models.user import User, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    user_service: UserService = Depends()
):
    return await user_service.get_user(user_id)

@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    user_service: UserService = Depends()
):
    return await user_service.update_user(user_id, user_update)
```

### Option 1: Gradual Migration (Recommended)

**Phase 1: API Layer (Circuit by Circuit)**

Map each Fusebox circuit to a FastAPI router:
- **Admin circuit** → `app/routes/admin.py`
- **estimation circuit** → `app/routes/estimation.py`
- **Reports circuit** → `app/routes/reports.py`

**Implementation Steps:**
1. Build REST API using FastAPI
2. Start with read-only endpoints
3. Wrap existing CF database calls initially
4. Expose core functions (projects, estimates, reports)

**Phase 2: Database Abstraction**
- Use SQLAlchemy ORM
- Create Pydantic models matching existing schema
- Implement repository pattern
- Gradually replace direct CF queries

**Phase 3: UI Modernization**
- Build React/Vue SPA frontend
- Consume FastAPI REST endpoints
- Replace Fusebox display files (dsp_*.cfm)
- Maintain feature parity

**Phase 4: Business Logic Migration**
- Port CF action files (act_*.cfm) to Python services
- Migrate circuit by circuit:
  1. Help (simplest, 10-20 files)
  2. Admin (86 files, well-defined)
  3. estimation (43 files, core business logic)
  4. Reports (194 files, most complex - consider last)
- Maintain parallel Fusebox/FastAPI during transition
- Use feature flags for gradual rollout

**Phase 5: Decommission Legacy**
- Cut over to new system
- Archive ColdFusion codebase
- Maintain CF code for reference

### Option 2: Clean Slate Rewrite

**Pros:**
- Modern architecture from ground up
- No legacy constraints
- Better code quality

**Cons:**
- High risk
- Feature parity challenges
- Loss of institutional knowledge

### Option 3: Hybrid Approach

**Keep ColdFusion for:**
- Complex reporting (already works)
- Legacy integrations

**Build New in Python for:**
- API layer
- New features
- Mobile access
- Cloud deployment

---

## 9. Business Domain Analysis

### Primary Domain: **Cost Estimation & Project Risk Management**

**Target Users:**
- Cost Estimators
- Project Managers
- Approvers/Reviewers
- Finance/Accounting

**Use Cases:**
1. Create detailed cost estimates for projects
2. Track estimation accuracy over time
3. Manage estimation approval workflows
4. Assess and manage project risks
5. Generate comprehensive cost reports
6. Maintain resource and supplier libraries

**Industry:**
- Likely consulting or government contracting
- Projects requiring detailed cost justification
- Basis of Estimate (BOE) documentation
- Compliance-driven estimation processes

---

## 10. Relationship to Modern FastAPI App

### Key Observations

**Domain Mismatch:**
- ICEPAC: Cost estimation and project management
- Current app/: MS Project file parsing API

**Possible Scenarios:**

1. **Modernization Project:**
   - Current app/ is the beginning of ICEPAC modernization
   - Focus on MS Project integration first
   - Will eventually port estimation features

2. **Shared Infrastructure:**
   - Both need MS Project file parsing
   - app/ provides reusable MPP reading service
   - ICEPAC could consume this API

3. **Separate Products:**
   - ICEPAC remains legacy
   - app/ is new product for different use case
   - Coincidental MS Project overlap

### Recommended Integration Strategy

```
┌─────────────────┐
│   FastAPI App   │  (Modern Python)
│   (app/)        │
└────────┬────────┘
         │
         ├─> MPP Parser Service (MPXJ)
         │
         ├─> REST API
         │   ├─> /projects
         │   ├─> /estimates
         │   ├─> /risks
         │   └─> /reports
         │
         ▼
┌─────────────────┐
│   Database      │
│   (SQLAlchemy)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Legacy      Modern
Tables      Tables
(read)      (write)
```

---

## Conclusion

ICEPAC is a **mature, feature-rich legacy system** that demonstrates:
- Strong domain expertise in cost estimation
- Comprehensive workflow support
- Robust reporting capabilities
- Production-grade security model

However, it requires modernization to:
- Support modern deployment (cloud, containers)
- Enable API-based integrations
- Improve maintainability
- Attract modern development talent

The existing FastAPI application provides an excellent foundation for modernization, particularly for the MS Project integration component. A phased migration approach is recommended to minimize risk while maximizing business value.

---

## Appendix: File Counts by Module

| Module | File Count | Key Features |
|--------|-----------|--------------|
| Reports | 194 | Cost control, BOE, audit reports |
| Admin | 86 | User mgmt, libraries, config |
| estimation | 43 | Estimation workflow, risk |
| Root | 91 | Entry points, security, core |
| Images | 224 | UI assets (GIF, JPG) |
| Help | Variable | Help system |
| **Total** | **414+ CFM** | |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-11
**Analyzed By:** Claude Code (Sonnet 4.5)
