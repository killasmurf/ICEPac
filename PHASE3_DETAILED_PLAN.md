# Phase 3: MS Project Integration - Detailed Implementation Plan

**Duration:** Weeks 8-13 (6 weeks, parallel with Phase 2)  
**Status:** Planning  
**Created:** 2026-01-27  

---

## Executive Summary

Phase 3 implements comprehensive Microsoft Project file integration, enabling users to upload and parse .mpp, .mpx, and .xml files. This is a critical dependency for Phase 4 (Estimation) as it provides the WBS structure and task hierarchy that estimators work with.

**Key Deliverables:**
- Complete MPXJ integration via JPype1
- S3-based file storage
- Async processing with Celery
- Project/Task database models
- Upload UI with progress tracking

---

## Current State Analysis

### Already Implemented ✅

| Component | File | Status |
|-----------|------|--------|
| Basic MPP Reader | `app/services/mpp_reader.py` | ✅ Partial |
| Celery Task | `app/tasks/mpp_tasks.py` | ✅ Partial |
| Upload Endpoint | `app/routes/project.py` | ✅ Basic |
| S3 Integration | `app/utils/s3_utils.py` | ✅ Complete |
| Validators | `app/utils/validators.py` | ✅ Complete |

### Needs Implementation 🔨

| Component | Priority | Complexity |
|-----------|----------|------------|
| Enhanced MPP Parser | High | High |
| Project Database Model | High | Medium |
| WBS/Task Database Model | High | Medium |
| Import Service | High | High |
| Progress Tracking | Medium | Medium |
| Upload UI | Medium | Medium |
| Comprehensive Tests | High | High |

---

## Technical Architecture

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│    S3       │────▶│   Celery    │
│   API       │     │   Storage   │     │   Worker    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │◀────│  WebSocket  │◀────│   MPXJ      │
│  Progress   │     │  /Polling   │     │   Parser    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Database   │
                                        │  (Projects, │
                                        │   Tasks)    │
                                        └─────────────┘
```

### File Format Support

| Format | Extension | Parser | Notes |
|--------|-----------|--------|-------|
| MS Project Binary | .mpp | MPXJ | Versions 2003-2021 |
| MS Project Exchange | .mpx | MPXJ | Legacy format |
| MS Project XML | .xml | MPXJ | XML-based, larger files |

---

## Detailed Implementation Plan

### Week 8-9: Enhanced MPXJ Integration

#### Task 8.1: Project Database Model
**File:** `app/models/database/project.py`

```python
class Project(Base):
    __tablename__ = "projects"
    
    id: int (PK)
    name: str (unique)
    description: str (nullable)
    project_manager_id: int (FK -> users.id)
    start_date: date
    finish_date: date
    baseline_start: date (nullable)
    baseline_finish: date (nullable)
    status: enum (draft, active, completed, archived)
    source_file: str (S3 key, nullable)
    source_format: str (mpp, mpx, xml, manual)
    created_at: datetime
    updated_at: datetime
    
    # Relationships
    manager: User
    tasks: List[Task]
```

#### Task 8.2: Task/WBS Database Model
**File:** `app/models/database/task.py`

```python
class Task(Base):
    __tablename__ = "tasks"
    
    id: int (PK)
    project_id: int (FK -> projects.id)
    unique_id: int (from MS Project)
    parent_id: int (FK -> tasks.id, nullable for root)
    wbs_code: str
    name: str
    outline_level: int
    
    # Schedule
    start_date: date
    finish_date: date
    duration: int (days)
    duration_units: str
    
    # Baseline
    baseline_start: date (nullable)
    baseline_finish: date (nullable)
    baseline_duration: int (nullable)
    
    # Late dates (for critical path)
    late_start: date (nullable)
    late_finish: date (nullable)
    
    # Progress
    percent_complete: decimal
    actual_start: date (nullable)
    actual_finish: date (nullable)
    
    # Estimation fields
    requirements: text (nullable)
    assumptions: text (nullable)
    approver_id: int (FK -> users.id, nullable)
    approval_date: datetime (nullable)
    estimate_revision: int (default 0)
    
    # Flags
    is_milestone: bool
    is_summary: bool
    is_critical: bool
    
    created_at: datetime
    updated_at: datetime
    
    # Relationships
    project: Project
    parent: Task
    children: List[Task]
    assignments: List[ResourceAssignment]
```

#### Task 8.3: Enhanced MPP Parser Service
**File:** `app/services/mpp_parser.py`

```python
class MPPParserService:
    """Enhanced MS Project parser with full data extraction."""
    
    def __init__(self):
        self._ensure_jvm_started()
    
    def parse_file(self, file_path: str) -> ParsedProject:
        """Parse MS Project file from S3 or local path."""
    
    def parse_bytes(self, content: bytes, filename: str) -> ParsedProject:
        """Parse MS Project file from bytes."""
    
    def _extract_project_metadata(self, project) -> ProjectMetadata:
        """Extract project-level information."""
        # Name, dates, author, company, etc.
    
    def _extract_tasks(self, project) -> List[ParsedTask]:
        """Extract all tasks with hierarchy."""
        # UniqueID, WBS, name, dates, duration
        # Baseline dates, late dates
        # Percent complete, milestones
    
    def _extract_resources(self, project) -> List[ParsedResource]:
        """Extract resource definitions."""
        # ID, name, type, cost, units
    
    def _extract_assignments(self, project) -> List[ParsedAssignment]:
        """Extract resource assignments."""
        # Task ID, Resource ID, units, work
    
    def _extract_calendars(self, project) -> List[ParsedCalendar]:
        """Extract calendar definitions."""
        # Working days, holidays, exceptions
    
    def _build_wbs_hierarchy(self, tasks: List[ParsedTask]) -> List[ParsedTask]:
        """Organize tasks into WBS hierarchy."""
```

**Extracted Data Classes:**
```python
@dataclass
class ParsedProject:
    name: str
    start_date: date
    finish_date: date
    author: str | None
    company: str | None
    tasks: List[ParsedTask]
    resources: List[ParsedResource]
    assignments: List[ParsedAssignment]

@dataclass
class ParsedTask:
    unique_id: int
    wbs: str
    name: str
    outline_level: int
    parent_unique_id: int | None
    start: date
    finish: date
    duration: str
    baseline_start: date | None
    baseline_finish: date | None
    late_start: date | None
    late_finish: date | None
    percent_complete: float
    is_milestone: bool
    is_summary: bool
    is_critical: bool
```

#### Task 8.4: Comprehensive Parser Tests
**File:** `tests/test_mpp_parser.py`

**Test Cases:**
1. Parse valid .mpp file (2016 format)
2. Parse valid .mpp file (2019 format)
3. Parse valid .mpp file (2021 format)
4. Parse valid .mpx file
5. Parse valid .xml file
6. Extract project metadata correctly
7. Extract tasks with correct hierarchy
8. Extract WBS codes correctly
9. Extract baseline dates
10. Extract resource assignments
11. Handle corrupt file gracefully
12. Handle empty project
13. Handle large file (100+ tasks)
14. Handle unicode characters in names
15. Handle missing optional fields

---

### Week 10-11: Upload & Processing Infrastructure

#### Task 10.1: Import Service
**File:** `app/services/import_service.py`

```python
class ProjectImportService:
    """Orchestrates the project import workflow."""
    
    def __init__(self, db: Session, s3_client, parser: MPPParserService):
        self.db = db
        self.s3 = s3_client
        self.parser = parser
    
    async def start_import(
        self,
        file_content: bytes,
        filename: str,
        user_id: int
    ) -> ImportJob:
        """Start async import job."""
        # 1. Validate file
        # 2. Upload to S3
        # 3. Create import job record
        # 4. Queue Celery task
        # 5. Return job ID for tracking
    
    def process_import(self, job_id: str) -> Project:
        """Process import (called by Celery worker)."""
        # 1. Download from S3
        # 2. Parse with MPXJ
        # 3. Create Project record
        # 4. Create Task records with hierarchy
        # 5. Update job status
        # 6. Return created project
    
    def get_import_status(self, job_id: str) -> ImportStatus:
        """Get current import status."""
    
    def _create_project(self, parsed: ParsedProject, user_id: int) -> Project:
        """Create project from parsed data."""
    
    def _create_tasks(self, project_id: int, tasks: List[ParsedTask]) -> List[Task]:
        """Create task hierarchy from parsed data."""
    
    def _validate_import(self, parsed: ParsedProject) -> List[str]:
        """Validate parsed data before import."""
```

#### Task 10.2: Import Job Model
**File:** `app/models/database/import_job.py`

```python
class ImportJob(Base):
    __tablename__ = "import_jobs"
    
    id: str (UUID, PK)
    user_id: int (FK -> users.id)
    filename: str
    s3_key: str
    status: enum (pending, processing, completed, failed)
    progress: int (0-100)
    project_id: int (FK -> projects.id, nullable)
    error_message: str (nullable)
    task_count: int (nullable)
    created_at: datetime
    updated_at: datetime
    completed_at: datetime (nullable)
```

#### Task 10.3: Enhanced Celery Task
**File:** `app/tasks/import_tasks.py`

```python
@celery_app.task(bind=True, name="tasks.import_project")
def import_project_task(self, job_id: str):
    """
    Async project import with progress tracking.
    
    Progress stages:
    - 0-10%: Downloading from S3
    - 10-50%: Parsing MS Project file
    - 50-90%: Creating database records
    - 90-100%: Finalizing
    """
    
    def update_progress(stage: str, percent: int):
        self.update_state(
            state="PROGRESS",
            meta={"stage": stage, "percent": percent}
        )
    
    # Implementation with progress updates
```

#### Task 10.4: Project Routes Enhancement
**File:** `app/routes/project.py` (update)

```python
@router.post("/upload")
async def upload_project(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> ImportJobResponse:
    """Upload MS Project file and start import."""

@router.get("/import/{job_id}/status")
async def get_import_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> ImportStatusResponse:
    """Get import job status."""

@router.get("/{project_id}/tasks")
async def get_project_tasks(
    project_id: int,
    include_hierarchy: bool = True,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> TaskListResponse:
    """Get project tasks with optional hierarchy."""

@router.get("/{project_id}/wbs")
async def get_project_wbs(
    project_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> WBSTreeResponse:
    """Get project WBS as tree structure."""
```

#### Task 10.5: Alembic Migration
**File:** `alembic/versions/003_project_tables.py`

```sql
-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    project_manager_id INTEGER REFERENCES users(id),
    start_date DATE,
    finish_date DATE,
    baseline_start DATE,
    baseline_finish DATE,
    status VARCHAR(20) DEFAULT 'draft',
    source_file VARCHAR(500),
    source_format VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    unique_id INTEGER NOT NULL,
    parent_id INTEGER REFERENCES tasks(id),
    wbs_code VARCHAR(100),
    name VARCHAR(500) NOT NULL,
    outline_level INTEGER DEFAULT 0,
    start_date DATE,
    finish_date DATE,
    duration INTEGER,
    duration_units VARCHAR(20),
    baseline_start DATE,
    baseline_finish DATE,
    baseline_duration INTEGER,
    late_start DATE,
    late_finish DATE,
    percent_complete NUMERIC(5,2) DEFAULT 0,
    actual_start DATE,
    actual_finish DATE,
    requirements TEXT,
    assumptions TEXT,
    approver_id INTEGER REFERENCES users(id),
    approval_date TIMESTAMP,
    estimate_revision INTEGER DEFAULT 0,
    is_milestone BOOLEAN DEFAULT false,
    is_summary BOOLEAN DEFAULT false,
    is_critical BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, unique_id)
);

-- Import jobs table
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    project_id INTEGER REFERENCES projects(id),
    error_message TEXT,
    task_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX ix_tasks_project_id ON tasks(project_id);
CREATE INDEX ix_tasks_parent_id ON tasks(parent_id);
CREATE INDEX ix_tasks_wbs_code ON tasks(wbs_code);
CREATE INDEX ix_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX ix_import_jobs_status ON import_jobs(status);
```

---

### Week 12-13: Frontend & Testing

#### Task 12.1: Frontend API Client
**File:** `frontend/src/api/project.ts`

```typescript
interface Project {
  id: number;
  name: string;
  description: string | null;
  project_manager_id: number;
  start_date: string;
  finish_date: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  task_count?: number;
}

interface Task {
  id: number;
  project_id: number;
  unique_id: number;
  parent_id: number | null;
  wbs_code: string;
  name: string;
  outline_level: number;
  start_date: string;
  finish_date: string;
  duration: number;
  percent_complete: number;
  is_milestone: boolean;
  is_summary: boolean;
  children?: Task[];
}

interface ImportJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  project_id: number | null;
  error_message: string | null;
}

// API Functions
uploadProject(file: File): Promise<ImportJob>
getImportStatus(jobId: string): Promise<ImportJob>
getProjects(): Promise<Project[]>
getProject(id: number): Promise<Project>
getProjectTasks(id: number): Promise<Task[]>
getProjectWBS(id: number): Promise<Task[]>  // Tree structure
```

#### Task 12.2: Upload Component
**File:** `frontend/src/components/project/ProjectUpload.tsx`

Features:
- Drag-and-drop file upload
- File type validation (.mpp, .mpx, .xml)
- File size validation (max 50MB)
- Upload progress bar
- Import progress tracking
- Error display
- Success redirect to project view

#### Task 12.3: WBS Tree Component
**File:** `frontend/src/components/project/WBSTree.tsx`

Features:
- Hierarchical tree view
- Expand/collapse nodes
- Task details on click
- Summary vs detail task styling
- Milestone indicators
- Critical path highlighting
- Search/filter tasks

#### Task 12.4: Integration Tests
**File:** `tests/integration/test_project_import.py`

Test Scenarios:
1. Complete upload → parse → import workflow
2. Large file handling (100+ tasks)
3. Concurrent imports
4. Import cancellation
5. Resume after failure
6. S3 cleanup on failure
7. Database rollback on error

---

## File Structure Summary

```
app/
├── models/
│   ├── database/
│   │   ├── project.py          # 🔨 Create
│   │   ├── task.py             # 🔨 Create
│   │   └── import_job.py       # 🔨 Create
│   └── schemas/
│       ├── project.py          # 🔨 Create
│       ├── task.py             # 🔨 Create
│       └── import_job.py       # 🔨 Create
├── repositories/
│   ├── project_repository.py   # 🔨 Create
│   └── task_repository.py      # 🔨 Create
├── services/
│   ├── mpp_parser.py           # 🔨 Create (enhanced)
│   ├── import_service.py       # 🔨 Create
│   └── project_service.py      # 🔨 Create
├── routes/
│   └── project.py              # ✏️ Update
└── tasks/
    └── import_tasks.py         # 🔨 Create (enhanced)

alembic/versions/
└── 003_project_tables.py       # 🔨 Create

tests/
├── test_mpp_parser.py          # 🔨 Create
├── test_import_service.py      # 🔨 Create
└── integration/
    └── test_project_import.py  # 🔨 Create

frontend/src/
├── api/
│   └── project.ts              # 🔨 Create
├── components/project/
│   ├── ProjectUpload.tsx       # 🔨 Create
│   ├── WBSTree.tsx             # 🔨 Create
│   └── TaskDetail.tsx          # 🔨 Create
└── pages/
    ├── Projects.tsx            # 🔨 Create
    └── ProjectDetail.tsx       # 🔨 Create
```

---

## Acceptance Criteria

| Criteria | Target |
|----------|--------|
| Supports .mpp format | ✅ 2003-2021 |
| Supports .mpx format | ✅ |
| Supports .xml format | ✅ |
| Correctly parses sample files | ✅ 100% |
| Handles large files (100+ tasks) | ✅ <30s |
| Async processing works | ✅ |
| Progress tracking works | ✅ |
| Data correctly stored in DB | ✅ |
| WBS hierarchy preserved | ✅ |
| Backend test coverage | 80%+ |
| Frontend test coverage | 70%+ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MPXJ version compatibility | Medium | High | Test with multiple MS Project versions |
| Large file memory issues | Medium | Medium | Stream processing, temp files |
| JVM startup latency | Low | Low | Keep JVM warm, connection pooling |
| S3 timeout on large files | Low | Medium | Multipart upload, retry logic |
| Celery task failures | Low | Medium | Retry mechanism, dead letter queue |

---

## Dependencies

- **Phase 2:** User authentication (for project ownership)
- **External:** Java Runtime Environment
- **External:** MPXJ library (JAR file)
- **External:** AWS S3 (or LocalStack for dev)
- **External:** Redis (for Celery)

---

## Sample Test Files Needed

Create/obtain test files:
1. `sample_small.mpp` - 10 tasks, simple hierarchy
2. `sample_medium.mpp` - 50 tasks, 3-level WBS
3. `sample_large.mpp` - 100+ tasks, complex hierarchy
4. `sample_with_resources.mpp` - Tasks with resource assignments
5. `sample_with_baselines.mpp` - Tasks with baseline dates
6. `sample_legacy.mpx` - MPX format file
7. `sample.xml` - XML format file
8. `sample_corrupt.mpp` - Corrupted file for error testing

---

## Timeline Summary

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 8 | Database Models | Project, Task, ImportJob models |
| 9 | Parser Enhancement | Full MPXJ integration with all data |
| 10 | Import Service | Orchestration, S3 integration |
| 11 | Celery Integration | Async processing, progress tracking |
| 12 | Frontend | Upload component, WBS tree |
| 13 | Testing & Polish | Integration tests, UAT, deploy |

---

**Document Status:** Ready for Implementation  
**Start Date:** When Phase 2 Week 8 begins  
**Critical Path:** Parser → Import Service → Database → Frontend
