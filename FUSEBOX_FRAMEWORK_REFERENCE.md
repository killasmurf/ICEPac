# Fusebox Framework Reference

**For ICEPAC Modernization Team**

This document provides context about the Fusebox framework used in the legacy ICEPAC codebase, to help developers understand the existing architecture and plan the migration to modern technologies.

---

## What is Fusebox?

**Fusebox** was a popular MVC web application framework for ColdFusion, widely used in the early-to-mid 2000s. It provided structure and standardization to ColdFusion applications before the advent of modern frameworks.

### Key Characteristics

- **Convention over Configuration**: Strict file naming and organizational patterns
- **Circuit-based Architecture**: Applications divided into functional modules (circuits)
- **Front Controller Pattern**: Single entry point (index.cfm) routes all requests
- **MVC Separation**: Clear separation of business logic, data access, and presentation

### Historical Context

- **Peak Popularity**: 2000-2008
- **Version Used in ICEPAC**: Likely Fusebox 3.x or 4.x
- **Decline**: Post-2010 with rise of modern frameworks (ColdBox, FW/1, etc.)
- **Legacy Status**: Now considered legacy, but many production apps still use it

---

## Core Fusebox Concepts

### 1. Fuseaction

The **fuseaction** is the fundamental routing mechanism in Fusebox.

**Format:** `?fuseaction=circuit.action`

**Examples:**
- `?fuseaction=admin.listUsers` - List users in admin circuit
- `?fuseaction=estimation.createEstimate` - Create estimate in estimation circuit
- `?fuseaction=reports.costControl` - Run cost control report

**Breakdown:**
- `circuit` = The module/subdirectory (e.g., Admin, estimation, Reports)
- `action` = The specific operation (e.g., listUsers, editUser, deleteUser)

### 2. Circuits

**Circuits** are self-contained functional modules, represented as subdirectories.

**ICEPAC Circuits:**
```
icepac/
├── Admin/         - User/resource/supplier management
├── estimation/    - Estimation workflow
├── Reports/       - Report generation
├── Help/          - Help system
└── Exports/       - Export functionality
```

**Circuit Structure:**
Each circuit contains:
- `act_*.cfm` files (actions)
- `dsp_*.cfm` files (displays)
- `qry_*.cfm` files (queries)

### 3. File Naming Conventions

**Action Files (`act_*.cfm`)**
- Contain business logic
- Handle form submissions
- Process data
- Make decisions

**Examples:**
- `act_login.cfm` - Process login
- `act_createProject.cfm` - Create new project
- `act_saveEstimate.cfm` - Save estimation data

**Display Files (`dsp_*.cfm`)**
- Render HTML/UI
- Display data
- Show forms
- Present results

**Examples:**
- `dsp_login.cfm` - Login form
- `dsp_projectList.cfm` - Project listing
- `dsp_estimateForm.cfm` - Estimation entry form

**Query Files (`qry_*.cfm`)**
- Contain database queries
- Reusable query components
- Data access layer

**Examples:**
- `qry_getUsers.cfm` - Fetch users
- `qry_getProject.cfm` - Fetch project
- `qry_saveEstimate.cfm` - Save estimate to DB

### 4. The Fusebox Switch (index.cfm)

The **Fusebox switch** is the single entry point for all requests.

**Responsibilities:**
1. Parse the `fuseaction` parameter
2. Extract circuit and action names
3. Route to appropriate circuit
4. Execute the requested action

**Pseudo-code:**
```cfml
<!-- index.cfm -->
<cfparam name="url.fuseaction" default="home.main">

<!-- Parse fuseaction -->
<cfset circuit = listFirst(url.fuseaction, ".")>
<cfset action = listLast(url.fuseaction, ".")>

<!-- Include application globals -->
<cfinclude template="app_global.cfm">

<!-- Route to circuit -->
<cfswitch expression="#circuit#">
    <cfcase value="admin">
        <cfinclude template="Admin/act_#action#.cfm">
    </cfcase>
    <cfcase value="estimation">
        <cfinclude template="estimation/act_#action#.cfm">
    </cfcase>
    <!-- ... more circuits ... -->
</cfswitch>
```

### 5. Application Globals (app_global.cfm)

**Purpose:**
- Initialize application
- Set up session variables
- Load configuration
- Define constants

**Typical Contents:**
- Database connection settings
- Session management
- Application-wide variables
- Security initialization

**In ICEPAC:**
```cfml
<!-- app_global.cfm -->
<cfapplication
    name="ICEPAC2"
    sessionmanagement="yes"
    clientmanagement="yes"
    setclientcookies="yes">

<!-- Load configuration -->
<cfinclude template="icepac.cfg">

<!-- Session setup -->
<cfif not isDefined("session.userID")>
    <cflocation url="index.cfm?fuseaction=login.display">
</cfif>
```

---

## Fusebox Request Lifecycle

### Step-by-Step Flow

**User Request:**
```
http://server/icepac/index.cfm?fuseaction=admin.editUser&userID=123
```

**Processing:**

1. **Entry Point** (`index.cfm`)
   - Parse fuseaction: `circuit="admin"`, `action="editUser"`
   - Parse parameters: `userID=123`

2. **Application Initialization** (`app_global.cfm`)
   - Check session
   - Load configuration
   - Set up variables

3. **Security Check** (`get_security_level.cfm`)
   - Verify user is logged in
   - Check permissions for admin circuit
   - Verify role allows editUser action

4. **Route to Circuit** (Admin/)
   - Navigate to Admin circuit directory

5. **Execute Action** (`Admin/act_editUser.cfm`)
   - Validate userID parameter
   - Check if user exists
   - Handle form submission (if POST)
   - Prepare data for display

6. **Query Data** (`Admin/qry_getUser.cfm`)
   - Fetch user from database
   - Get related data (roles, etc.)

7. **Render Display** (`Admin/dsp_editUser.cfm`)
   - Display edit form
   - Pre-populate with user data
   - Show validation errors (if any)

8. **Return Response**
   - Send HTML to browser

### Diagram

```
┌─────────────────────────────────────────┐
│  User Request                           │
│  ?fuseaction=admin.editUser&userID=123  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────┐
        │   index.cfm      │  (Fusebox Switch)
        │  Parse fuseaction│
        └─────────┬────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ app_global.cfm   │  (Initialize)
        └─────────┬────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │ get_security_level   │  (Security)
        └─────────┬────────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │  Route to Circuit    │
        │  Admin/              │
        └─────────┬────────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │  act_editUser.cfm    │  (Business Logic)
        └─────────┬────────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │  qry_getUser.cfm     │  (Data Access)
        └─────────┬────────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │  dsp_editUser.cfm    │  (Presentation)
        └─────────┬────────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │  HTML Response       │
        └──────────────────────┘
```

---

## Fusebox vs. Modern Frameworks

### Comparison: Fusebox → FastAPI

| Fusebox Concept | FastAPI Equivalent | Notes |
|-----------------|-------------------|-------|
| Circuit | APIRouter | Modular organization |
| Fuseaction | Route endpoint | URL routing |
| act_*.cfm | Route handler function | Business logic |
| dsp_*.cfm | Jinja2 template / JSON | Presentation layer |
| qry_*.cfm | SQLAlchemy / Repository | Data access |
| app_global.cfm | Middleware / Dependencies | Initialization |
| get_security_level | OAuth2 / JWT dependencies | Authentication |
| FormURL2Attributes | Pydantic models | Request validation |
| index.cfm (switch) | FastAPI app router | Request routing |
| Circuit directory | Python package | Module organization |

### Architecture Mapping

**Fusebox Structure:**
```
icepac/
├── index.cfm               # Switch
├── app_global.cfm          # Init
├── Admin/                  # Circuit
│   ├── act_editUser.cfm   # Action
│   ├── dsp_editUser.cfm   # Display
│   └── qry_getUser.cfm    # Query
└── estimation/             # Circuit
    ├── act_createEstimate.cfm
    ├── dsp_estimateForm.cfm
    └── qry_saveEstimate.cfm
```

**FastAPI Structure:**
```
app/
├── main.py                 # App entry point
├── core/
│   ├── config.py          # Configuration
│   └── security.py        # Auth/security
├── routes/                 # Routers (circuits)
│   ├── admin.py           # Admin router
│   └── estimation.py      # Estimation router
├── services/               # Business logic (actions)
│   ├── user_service.py
│   └── estimate_service.py
├── repositories/           # Data access (queries)
│   ├── user_repository.py
│   └── estimate_repository.py
├── models/                 # Pydantic models
│   ├── user.py
│   └── estimate.py
└── templates/              # Jinja2 (displays)
    ├── edit_user.html
    └── estimate_form.html
```

---

## Migration Strategy

### Circuit-by-Circuit Migration

**Recommended Order:**

1. **Help Circuit** (Simplest)
   - ~10-20 files
   - Read-only operations
   - Good learning opportunity

2. **Admin Circuit** (Well-defined)
   - ~86 files
   - CRUD operations
   - Standard patterns

3. **Estimation Circuit** (Core Business)
   - ~43 files
   - Complex workflows
   - Critical functionality

4. **Reports Circuit** (Most Complex)
   - ~194 files
   - Complex queries
   - Consider microservice

### Migration Process for Each Circuit

**Example: Admin Circuit → admin.py Router**

**Step 1: Inventory**
- List all fuseactions in Admin circuit
- Document parameters and behavior
- Identify dependencies

**Step 2: Model Creation**
```python
# app/models/user.py
from pydantic import BaseModel

class User(BaseModel):
    user_id: int
    username: str
    first_name: str
    last_name: str
    role: str

class UserCreate(BaseModel):
    username: str
    first_name: str
    last_name: str
    password: str
    role: str
```

**Step 3: Repository Layer**
```python
# app/repositories/user_repository.py
from sqlalchemy.orm import Session
from app.models.database import User as DBUser

class UserRepository:
    def get_user(self, db: Session, user_id: int):
        return db.query(DBUser).filter(DBUser.user_id == user_id).first()

    def create_user(self, db: Session, user_data: dict):
        db_user = DBUser(**user_data)
        db.add(db_user)
        db.commit()
        return db_user
```

**Step 4: Service Layer**
```python
# app/services/user_service.py
from app.repositories.user_repository import UserRepository
from app.models.user import User, UserCreate

class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def get_user(self, user_id: int) -> User:
        db_user = self.repository.get_user(user_id)
        return User.from_orm(db_user)
```

**Step 5: Router Implementation**
```python
# app/routes/admin.py
from fastapi import APIRouter, Depends
from app.services.user_service import UserService
from app.models.user import User, UserCreate

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    service: UserService = Depends()
) -> User:
    return await service.get_user(user_id)

@router.post("/users")
async def create_user(
    user_data: UserCreate,
    service: UserService = Depends()
) -> User:
    return await service.create_user(user_data)
```

**Step 6: Testing**
```python
# tests/test_admin.py
import pytest
from fastapi.testclient import TestClient

def test_get_user(client: TestClient):
    response = client.get("/admin/users/1")
    assert response.status_code == 200
    assert response.json()["user_id"] == 1
```

---

## Common Fusebox Patterns in ICEPAC

### Pattern 1: CRUD Operations

**Fusebox:**
- `act_listUsers.cfm` → List
- `act_addUser.cfm` → Create
- `act_editUser.cfm` → Update (form)
- `act_saveUser.cfm` → Update (save)
- `act_deleteUser.cfm` → Delete

**FastAPI:**
```python
@router.get("/users")           # List
@router.post("/users")          # Create
@router.get("/users/{id}")      # Read
@router.put("/users/{id}")      # Update
@router.delete("/users/{id}")   # Delete
```

### Pattern 2: Form Display + Processing

**Fusebox:**
1. `dsp_editUser.cfm` - Show form
2. User submits form
3. `act_saveUser.cfm` - Process form
4. Redirect to `?fuseaction=admin.listUsers`

**FastAPI:**
1. `GET /users/{id}/edit` - Return form template or user data
2. User submits form
3. `PUT /users/{id}` - Process update
4. Return success response or redirect

### Pattern 3: Security Checks

**Fusebox:**
```cfml
<!-- get_security_level.cfm -->
<cfif not isDefined("session.userID")>
    <cflocation url="index.cfm?fuseaction=login.display">
</cfif>

<cfquery name="getUserRole">
    SELECT role FROM tblSecurity
    WHERE userID = #session.userID#
</cfquery>

<cfif getUserRole.role NEQ "Admin">
    <cfthrow message="Access Denied">
</cfif>
```

**FastAPI:**
```python
from fastapi import Depends, HTTPException
from app.core.security import get_current_user, require_role

@router.get("/admin/users")
async def list_users(
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_role("Admin"))
):
    # Only admins can access
    return await user_service.list_users()
```

---

## Tips for Understanding ICEPAC Fusebox Code

### 1. Follow the Fuseaction

To understand a feature:
1. Find the fuseaction (e.g., `?fuseaction=estimation.createEstimate`)
2. Locate the circuit (`estimation/`)
3. Find the action file (`act_createEstimate.cfm`)
4. Trace through includes and queries
5. Find the display file (`dsp_estimateForm.cfm`)

### 2. Read in Order

Typical execution order within a circuit:
1. Action file (`act_*.cfm`) - Business logic
2. Query file (`qry_*.cfm`) - Database operations
3. Display file (`dsp_*.cfm`) - HTML output

### 3. Look for `<cfinclude>` Tags

Fusebox uses `<cfinclude>` extensively:
```cfml
<cfinclude template="qry_getUsers.cfm">
<cfinclude template="dsp_userList.cfm">
```

These pull in other files inline - trace through them to understand flow.

### 4. Check `app_global.cfm`

For global variables, sessions, and configuration:
```cfml
<cfset application.datasource = "icepac">
<cfset session.userID = 123>
```

### 5. FormURL2Attributes.cfm

This Fusebox utility converts URL/form parameters to local variables:
```cfml
<cf_FormURL2Attributes attributelist="userID,projectID">
<!-- Now userID and projectID are local variables -->
```

---

## Resources

### Documentation
- Original Fusebox documentation (archived)
- ColdFusion documentation (Adobe/Lucee)

### Migration Guides
- Fusebox to ColdBox migration
- ColdFusion to Python migration patterns
- Legacy system modernization strategies

### Tools
- CF to Python code converters (limited)
- Database schema extraction tools
- API generation from CF code

---

## Conclusion

Understanding Fusebox is crucial for successfully modernizing ICEPAC. The framework's strict conventions make it relatively straightforward to map to modern equivalents like FastAPI, but the sheer volume of files (414 CFM files) requires a systematic, circuit-by-circuit approach.

The key is to **preserve business logic** while **modernizing the implementation**. Fusebox's clear separation of concerns (act/dsp/qry) actually makes this migration more manageable than it might otherwise be.

---

**Document Version:** 1.0
**Created:** 2026-01-11
**Purpose:** Support ICEPAC modernization effort
**Intended Audience:** Development team migrating ICEPAC to FastAPI
