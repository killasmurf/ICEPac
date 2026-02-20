# Phase 2: Admin Circuit Migration - Detailed Implementation Plan

**Duration:** Weeks 8-15 (8 weeks)  
**Status:** Planning  
**Created:** 2026-01-26  

---

## Executive Summary

Phase 2 migrates the Admin Circuit (86 legacy CFM files) to the modern FastAPI/React stack. This phase establishes:
- Complete user management with RBAC
- Resource library CRUD operations
- Supplier management system
- Configuration/lookup table administration
- Audit logging infrastructure
- Reusable admin UI components

---

## Current State Analysis

### Already Implemented ✅

Based on project knowledge search, these components already exist:

| Component | File | Status |
|-----------|------|--------|
| User Model | `app/models/database/user.py` | ✅ Complete |
| User Schema | `app/models/schemas/user.py` | ✅ Complete |
| User Service | `app/services/user_service.py` | ✅ Complete |
| User Repository | `app/repositories/user_repository.py` | ✅ Complete |
| Resource Model | `app/models/database/resource.py` | ✅ Complete |
| Resource Schema | `app/models/schemas/resource.py` | ✅ Complete |
| Config Tables Model | `app/models/database/config_tables.py` | ✅ Complete |
| Auth Routes | `app/routes/auth.py` | ✅ Complete |
| Admin Routes | `app/routes/admin.py` | ✅ Partial |
| Security Core | `app/core/security.py` | ✅ Complete |
| Initial Migration | `alembic/versions/a41d9a15aea8_...` | ✅ Complete |

### Needs Implementation 🔨

| Component | Priority | Complexity |
|-----------|----------|------------|
| Resource Service | High | Medium |
| Resource Repository | High | Low |
| Supplier Service | High | Medium |
| Supplier Repository | High | Low |
| Config Service | Medium | Low |
| Audit Log Model & Service | High | Medium |
| Alembic Migration (Admin) | High | Medium |
| Comprehensive Tests | High | High |
| Frontend Components | High | High |

---

## Detailed Implementation Plan

### Week 8-9: Complete Backend Infrastructure

#### Task 8.1: Resource Service & Repository
**Files to Create:**
```
app/repositories/resource_repository.py
app/services/resource_service.py
```

**ResourceRepository Methods:**
```python
class ResourceRepository(BaseRepository[Resource]):
    def get_by_code(self, resource_code: str) -> Optional[Resource]
    def get_active(self, skip: int, limit: int) -> List[Resource]
    def search(self, query: str, skip: int, limit: int) -> List[Resource]
    def count(self) -> int
```

**ResourceService Methods:**
```python
class ResourceService:
    def get(self, resource_id: int) -> Optional[Resource]
    def get_or_404(self, resource_id: int) -> Resource
    def get_by_code(self, code: str) -> Optional[Resource]
    def get_multi(self, skip: int, limit: int) -> List[Resource]
    def search(self, query: str, skip: int, limit: int) -> List[Resource]
    def count(self) -> int
    def create(self, resource_in: ResourceCreate) -> Resource
    def update(self, resource_id: int, resource_in: ResourceUpdate) -> Resource
    def delete(self, resource_id: int) -> bool
```

#### Task 8.2: Supplier Service & Repository
**Files to Create:**
```
app/repositories/supplier_repository.py
app/services/supplier_service.py
```

**SupplierRepository Methods:**
```python
class SupplierRepository(BaseRepository[Supplier]):
    def get_by_code(self, supplier_code: str) -> Optional[Supplier]
    def get_active(self, skip: int, limit: int) -> List[Supplier]
    def search(self, query: str, skip: int, limit: int) -> List[Supplier]
    def count(self) -> int
```

**SupplierService Methods:**
```python
class SupplierService:
    def get(self, supplier_id: int) -> Optional[Supplier]
    def get_or_404(self, supplier_id: int) -> Supplier
    def get_by_code(self, code: str) -> Optional[Supplier]
    def get_multi(self, skip: int, limit: int) -> List[Supplier]
    def search(self, query: str, skip: int, limit: int) -> List[Supplier]
    def count(self) -> int
    def create(self, supplier_in: SupplierCreate) -> Supplier
    def update(self, supplier_id: int, supplier_in: SupplierUpdate) -> Supplier
    def delete(self, supplier_id: int) -> bool
```

#### Task 8.3: Config Service (Generic CRUD)
**Files to Create:**
```
app/services/config_service.py
```

**ConfigService (Generic for all config tables):**
```python
class ConfigService:
    def __init__(self, model: Type[Base], db: Session):
        self.model = model
        self.db = db
    
    def get_all(self) -> List[Any]
    def get(self, item_id: int) -> Optional[Any]
    def get_by_code(self, code: str) -> Optional[Any]
    def create(self, data: dict) -> Any
    def update(self, item_id: int, data: dict) -> Any
    def delete(self, item_id: int) -> bool
```

#### Task 8.4: Audit Log Infrastructure
**Files to Create:**
```
app/models/database/audit_log.py
app/models/schemas/audit_log.py
app/services/audit_service.py
```

**AuditLog Model:**
```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id: int (PK)
    user_id: int (FK -> users.id, nullable)
    action: str  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity_type: str  # User, Resource, Supplier, etc.
    entity_id: int (nullable)
    old_values: JSON (nullable)
    new_values: JSON (nullable)
    ip_address: str (nullable)
    user_agent: str (nullable)
    created_at: datetime
```

**AuditService Methods:**
```python
class AuditService:
    def log_action(
        self, 
        user_id: int,
        action: str,
        entity_type: str,
        entity_id: int = None,
        old_values: dict = None,
        new_values: dict = None,
        request: Request = None
    ) -> AuditLog
    
    def get_logs(
        self,
        user_id: int = None,
        entity_type: str = None,
        entity_id: int = None,
        action: str = None,
        start_date: datetime = None,
        end_date: datetime = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLog]
```

#### Task 8.5: Alembic Migration for Admin Tables
**File:** `alembic/versions/002_admin_tables.py`

**Tables to Create:**
```sql
-- Resources table
CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    resource_code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(500) NOT NULL,
    eoc VARCHAR(50),
    cost NUMERIC(18,2) DEFAULT 0,
    units VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Configuration tables (all have same structure)
CREATE TABLE cost_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE expense_types (...same structure...);
CREATE TABLE regions (...same structure...);
CREATE TABLE business_areas (...same structure...);
CREATE TABLE estimating_techniques (...same structure...);
CREATE TABLE risk_categories (...same structure...);

-- Weighted configuration tables
CREATE TABLE probability_levels (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255) NOT NULL,
    weight NUMERIC(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE severity_levels (...same + weight...);
CREATE TABLE pmb_weights (...same + weight...);

-- Audit log table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX ix_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX ix_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX ix_audit_logs_created_at ON audit_logs(created_at);
```

---

### Week 10-11: API Completion & Testing

#### Task 10.1: Complete Admin Routes
**Update:** `app/routes/admin.py`

**Endpoints to Verify/Complete:**

```
# User Management (already implemented - verify)
GET    /admin/users                    - List users (paginated)
GET    /admin/users/{id}               - Get user
POST   /admin/users                    - Create user
PUT    /admin/users/{id}               - Update user
DELETE /admin/users/{id}               - Delete user
PUT    /admin/users/{id}/password      - Change password

# New: User Role Management
GET    /admin/users/{id}/roles         - Get user roles
PUT    /admin/users/{id}/roles         - Update user roles

# Resource Management
GET    /admin/resources                - List resources
GET    /admin/resources/{id}           - Get resource
POST   /admin/resources                - Create resource
PUT    /admin/resources/{id}           - Update resource
DELETE /admin/resources/{id}           - Delete resource

# Supplier Management
GET    /admin/suppliers                - List suppliers
GET    /admin/suppliers/{id}           - Get supplier
POST   /admin/suppliers                - Create supplier
PUT    /admin/suppliers/{id}           - Update supplier
DELETE /admin/suppliers/{id}           - Delete supplier

# Configuration Tables (generic)
GET    /admin/config/{table}           - List items
GET    /admin/config/{table}/{id}      - Get item
POST   /admin/config/{table}           - Create item
PUT    /admin/config/{table}/{id}      - Update item
DELETE /admin/config/{table}/{id}      - Delete item

# Available tables:
# cost-types, expense-types, regions, business-areas,
# estimating-techniques, risk-categories, expenditure-indicators,
# probability-levels, severity-levels, pmb-weights

# Audit Logs
GET    /admin/audit-logs               - List audit logs (with filters)
GET    /admin/audit-logs/{id}          - Get audit log detail
```

#### Task 10.2: Comprehensive Unit Tests
**Files to Create:**
```
tests/test_admin_users.py
tests/test_admin_resources.py
tests/test_admin_suppliers.py
tests/test_admin_config.py
tests/test_audit_service.py
```

**Test Coverage Targets:**
| Module | Target | Tests |
|--------|--------|-------|
| UserService | 90% | 15+ |
| ResourceService | 90% | 12+ |
| SupplierService | 90% | 12+ |
| ConfigService | 85% | 10+ |
| AuditService | 85% | 8+ |
| Admin Routes | 80% | 30+ |
| **Total** | **85%+** | **87+** |

**Test Categories:**
1. **Repository Tests** - CRUD operations, queries, filters
2. **Service Tests** - Business logic, validation, error handling
3. **Route Tests** - HTTP responses, auth, permissions
4. **Integration Tests** - End-to-end workflows

---

### Week 12-13: Frontend Implementation

#### Task 12.1: API Client Extensions
**File:** `frontend/src/api/admin.ts`

```typescript
// Types
interface User { id, email, username, fullName, role, isActive, ... }
interface Resource { id, resourceCode, description, eoc, cost, units, ... }
interface Supplier { id, supplierCode, name, contact, phone, email, ... }
interface ConfigItem { id, code, description, isActive }
interface AuditLog { id, userId, action, entityType, entityId, createdAt, ... }

// User API
getUsers(skip, limit): Promise<PaginatedResponse<User>>
getUser(id): Promise<User>
createUser(data): Promise<User>
updateUser(id, data): Promise<User>
deleteUser(id): Promise<void>
updateUserPassword(id, data): Promise<void>

// Resource API
getResources(skip, limit, search?): Promise<PaginatedResponse<Resource>>
getResource(id): Promise<Resource>
createResource(data): Promise<Resource>
updateResource(id, data): Promise<Resource>
deleteResource(id): Promise<void>

// Supplier API
getSuppliers(skip, limit, search?): Promise<PaginatedResponse<Supplier>>
getSupplier(id): Promise<Supplier>
createSupplier(data): Promise<Supplier>
updateSupplier(id, data): Promise<Supplier>
deleteSupplier(id): Promise<void>

// Config API
getConfigItems(tableName): Promise<ConfigItem[]>
createConfigItem(tableName, data): Promise<ConfigItem>
updateConfigItem(tableName, id, data): Promise<ConfigItem>
deleteConfigItem(tableName, id): Promise<void>

// Audit API
getAuditLogs(filters): Promise<PaginatedResponse<AuditLog>>
```

#### Task 12.2: Reusable Admin Components
**Files to Create:**
```
frontend/src/components/admin/
├── DataGrid.tsx           # Generic data grid with sorting/filtering
├── FormDialog.tsx         # Modal form for create/edit
├── ConfirmDialog.tsx      # Confirmation dialog for deletes
├── SearchBar.tsx          # Search input with debounce
├── Pagination.tsx         # Pagination controls
├── StatusBadge.tsx        # Active/Inactive badge
└── RoleBadge.tsx          # User role badge
```

**DataGrid Component Features:**
- Column sorting (click headers)
- Column filtering
- Row selection
- Action buttons (edit, delete)
- Loading state
- Empty state
- Responsive design

#### Task 12.3: Admin Page Components
**Files to Create:**
```
frontend/src/pages/admin/
├── AdminLayout.tsx        # Admin section layout with sidebar
├── UserManagement.tsx     # User list + CRUD
├── UserForm.tsx           # User create/edit form
├── ResourceLibrary.tsx    # Resource list + CRUD
├── ResourceForm.tsx       # Resource create/edit form
├── SupplierManagement.tsx # Supplier list + CRUD
├── SupplierForm.tsx       # Supplier create/edit form
├── ConfigTables.tsx       # Config table selector + generic CRUD
├── AuditLogs.tsx          # Audit log viewer with filters
└── index.ts               # Exports
```

#### Task 12.4: Admin Routing
**Update:** `frontend/src/App.tsx`

```tsx
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<AdminDashboard />} />
  <Route path="users" element={<UserManagement />} />
  <Route path="users/new" element={<UserForm />} />
  <Route path="users/:id" element={<UserForm />} />
  <Route path="resources" element={<ResourceLibrary />} />
  <Route path="resources/new" element={<ResourceForm />} />
  <Route path="resources/:id" element={<ResourceForm />} />
  <Route path="suppliers" element={<SupplierManagement />} />
  <Route path="suppliers/new" element={<SupplierForm />} />
  <Route path="suppliers/:id" element={<SupplierForm />} />
  <Route path="config" element={<ConfigTables />} />
  <Route path="audit-logs" element={<AuditLogs />} />
</Route>
```

---

### Week 14-15: Integration, Testing & UAT

#### Task 14.1: Frontend Tests
**Files to Create:**
```
frontend/src/__tests__/
├── admin/
│   ├── UserManagement.test.tsx
│   ├── ResourceLibrary.test.tsx
│   ├── SupplierManagement.test.tsx
│   └── ConfigTables.test.tsx
└── components/
    └── DataGrid.test.tsx
```

**Test Coverage:** 70%+ for frontend components

#### Task 14.2: Integration Tests
**Files to Create:**
```
tests/integration/
├── test_user_workflow.py      # Full user CRUD workflow
├── test_resource_workflow.py  # Full resource workflow
├── test_supplier_workflow.py  # Full supplier workflow
└── test_admin_permissions.py  # RBAC verification
```

#### Task 14.3: User Acceptance Testing
**UAT Checklist:**
- [ ] Admin can create/edit/delete users
- [ ] Admin can assign roles to users
- [ ] Admin can manage resources
- [ ] Admin can manage suppliers
- [ ] Admin can manage configuration tables
- [ ] Audit logs capture all changes
- [ ] Non-admin users cannot access admin routes
- [ ] UI is responsive on mobile
- [ ] Forms validate input correctly
- [ ] Error messages are clear

#### Task 14.4: Documentation
**Files to Create/Update:**
```
PHASE2_PROGRESS.md           # Progress report
docs/admin-api.md            # API documentation
docs/admin-ui-guide.md       # Admin UI user guide
```

---

## File Structure Summary

```
app/
├── models/
│   ├── database/
│   │   ├── user.py           # ✅ Exists
│   │   ├── resource.py       # ✅ Exists
│   │   ├── config_tables.py  # ✅ Exists
│   │   └── audit_log.py      # 🔨 Create
│   └── schemas/
│       ├── user.py           # ✅ Exists
│       ├── resource.py       # ✅ Exists
│       ├── config.py         # ✅ Exists
│       └── audit_log.py      # 🔨 Create
├── repositories/
│   ├── base.py               # ✅ Exists
│   ├── user_repository.py    # ✅ Exists
│   ├── resource_repository.py    # 🔨 Create
│   ├── supplier_repository.py    # 🔨 Create
│   └── audit_repository.py       # 🔨 Create
├── services/
│   ├── user_service.py       # ✅ Exists
│   ├── resource_service.py   # 🔨 Create
│   ├── supplier_service.py   # 🔨 Create (separate from resource)
│   ├── config_service.py     # 🔨 Create
│   └── audit_service.py      # 🔨 Create
└── routes/
    ├── admin.py              # ✅ Partial - Complete
    └── auth.py               # ✅ Exists

alembic/versions/
└── 002_admin_tables.py       # 🔨 Create

tests/
├── test_admin_users.py       # 🔨 Create
├── test_admin_resources.py   # 🔨 Create
├── test_admin_suppliers.py   # 🔨 Create
├── test_admin_config.py      # 🔨 Create
└── test_audit_service.py     # 🔨 Create

frontend/src/
├── api/
│   └── admin.ts              # 🔨 Create
├── components/admin/
│   ├── DataGrid.tsx          # 🔨 Create
│   ├── FormDialog.tsx        # 🔨 Create
│   └── ...                   # 🔨 Create
└── pages/admin/
    ├── AdminLayout.tsx       # 🔨 Create
    ├── UserManagement.tsx    # 🔨 Create
    ├── ResourceLibrary.tsx   # 🔨 Create
    ├── SupplierManagement.tsx# 🔨 Create
    ├── ConfigTables.tsx      # 🔨 Create
    └── AuditLogs.tsx         # 🔨 Create
```

---

## Acceptance Criteria

| Criteria | Target |
|----------|--------|
| All admin functions migrated | ✅ 100% |
| RBAC working correctly | ✅ |
| UI improves on legacy usability | ✅ |
| Backend test coverage | 85%+ |
| Frontend test coverage | 70%+ |
| Audit logging in place | ✅ |
| API response time | <300ms |
| Feature flag for toggle | ✅ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Legacy data migration complexity | Medium | High | Test with production data subset |
| RBAC implementation gaps | Low | High | Comprehensive permission testing |
| Frontend complexity | Medium | Medium | Use proven component library |
| Audit log performance | Low | Medium | Async logging, batch writes |

---

## Dependencies

- Phase 1 complete ✅
- Database access configured ✅
- Authentication working ✅
- Base repository pattern established ✅

---

## Timeline Summary

| Week | Focus | Deliverables |
|------|-------|-------------|
| 8 | Backend Services | Resource, Supplier, Config services |
| 9 | Audit & Migration | Audit service, Alembic migration |
| 10 | API Completion | Complete admin routes |
| 11 | Backend Testing | 87+ unit tests, 85%+ coverage |
| 12 | Frontend API | API client, reusable components |
| 13 | Frontend Pages | All admin pages |
| 14 | Integration | E2E tests, UAT |
| 15 | Polish & Deploy | Documentation, feature flag, deploy |

---

## Next Steps

1. **Immediate:** Create resource repository and service
2. **This Week:** Complete Alembic migration for admin tables
3. **Code Review:** Verify existing admin routes are complete
4. **Planning:** Schedule UAT sessions with stakeholders

---

**Document Status:** Ready for Implementation  
**Approved By:** [Pending]  
**Start Date:** [TBD]
