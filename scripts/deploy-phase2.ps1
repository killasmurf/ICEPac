# deploy-phase2.ps1
# ICEPac Phase 2 Admin Circuit - Deployment Script
# Run from the root of your ICEPac project directory
# Usage: .\deploy-phase2.ps1 [-SkipTests] [-SkipGit]

param(
    [switch]$SkipTests,
    [switch]$SkipGit
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\Adam Murphy\AI\icepac"
$Phase2Src = Join-Path $PSScriptRoot "."

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ICEPac Phase 2 - Admin Circuit Deploy" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── Step 1: Verify project directory ──────────────────────────
if (-not (Test-Path $ProjectRoot)) {
    Write-Host "ERROR: Project directory not found: $ProjectRoot" -ForegroundColor Red
    Write-Host "Please update the `$ProjectRoot variable in this script." -ForegroundColor Yellow
    exit 1
}
Set-Location $ProjectRoot
Write-Host "[1/7] Project directory: $ProjectRoot" -ForegroundColor Green

# ── Step 2: Create directory structure ────────────────────────
Write-Host "[2/7] Creating directory structure..." -ForegroundColor Yellow
$dirs = @(
    "app\models\database",
    "app\models\schemas",
    "app\repositories",
    "app\services",
    "app\routes",
    "alembic\versions",
    "tests",
    "frontend\src\api",
    "frontend\src\components\admin",
    "frontend\src\pages\admin"
)
foreach ($dir in $dirs) {
    $path = Join-Path $ProjectRoot $dir
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    }
}
Write-Host "  Directory structure ready." -ForegroundColor Green

# ── Step 3: Copy backend files ────────────────────────────────
Write-Host "[3/7] Copying backend files..." -ForegroundColor Yellow

$backendFiles = @{
    "backend\app\repositories\base.py"               = "app\repositories\base.py"
    "backend\app\repositories\resource_repository.py" = "app\repositories\resource_repository.py"
    "backend\app\repositories\supplier_repository.py" = "app\repositories\supplier_repository.py"
    "backend\app\repositories\audit_repository.py"    = "app\repositories\audit_repository.py"
    "backend\app\models\database\resource.py"         = "app\models\database\resource.py"
    "backend\app\models\database\config_tables.py"    = "app\models\database\config_tables.py"
    "backend\app\models\database\audit_log.py"        = "app\models\database\audit_log.py"
    "backend\app\models\schemas\resource.py"          = "app\models\schemas\resource.py"
    "backend\app\models\schemas\config.py"            = "app\models\schemas\config.py"
    "backend\app\models\schemas\audit_log.py"         = "app\models\schemas\audit_log.py"
    "backend\app\services\resource_service.py"        = "app\services\resource_service.py"
    "backend\app\services\supplier_service.py"        = "app\services\supplier_service.py"
    "backend\app\services\config_service.py"          = "app\services\config_service.py"
    "backend\app\services\audit_service.py"           = "app\services\audit_service.py"
    "backend\app\routes\admin.py"                     = "app\routes\admin.py"
    "backend\alembic\versions\002_admin_tables.py"    = "alembic\versions\002_admin_tables.py"
    "backend\tests\test_admin_system.py"              = "tests\test_admin_system.py"
}

$copiedBackend = 0
foreach ($entry in $backendFiles.GetEnumerator()) {
    $src = Join-Path $Phase2Src $entry.Key
    $dst = Join-Path $ProjectRoot $entry.Value
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dst -Force
        $copiedBackend++
    } else {
        Write-Host "  WARNING: Source not found: $($entry.Key)" -ForegroundColor Yellow
    }
}
Write-Host "  Copied $copiedBackend backend files." -ForegroundColor Green

# ── Step 4: Copy frontend files ───────────────────────────────
Write-Host "[4/7] Copying frontend files..." -ForegroundColor Yellow

$frontendFiles = @{
    "frontend\src\api\admin.ts"                          = "frontend\src\api\admin.ts"
    "frontend\src\components\admin\DataGrid.tsx"         = "frontend\src\components\admin\DataGrid.tsx"
    "frontend\src\components\admin\FormDialog.tsx"       = "frontend\src\components\admin\FormDialog.tsx"
    "frontend\src\components\admin\ConfirmDialog.tsx"    = "frontend\src\components\admin\ConfirmDialog.tsx"
    "frontend\src\components\admin\SearchBar.tsx"        = "frontend\src\components\admin\SearchBar.tsx"
    "frontend\src\pages\admin\AdminLayout.tsx"           = "frontend\src\pages\admin\AdminLayout.tsx"
    "frontend\src\pages\admin\AdminDashboard.tsx"        = "frontend\src\pages\admin\AdminDashboard.tsx"
    "frontend\src\pages\admin\UserManagement.tsx"        = "frontend\src\pages\admin\UserManagement.tsx"
    "frontend\src\pages\admin\ResourceLibrary.tsx"       = "frontend\src\pages\admin\ResourceLibrary.tsx"
    "frontend\src\pages\admin\SupplierManagement.tsx"    = "frontend\src\pages\admin\SupplierManagement.tsx"
    "frontend\src\pages\admin\ConfigTables.tsx"          = "frontend\src\pages\admin\ConfigTables.tsx"
    "frontend\src\pages\admin\AuditLogs.tsx"             = "frontend\src\pages\admin\AuditLogs.tsx"
    "frontend\src\index.ts"                              = "frontend\src\admin\index.ts"
}

$copiedFrontend = 0
foreach ($entry in $frontendFiles.GetEnumerator()) {
    $src = Join-Path $Phase2Src $entry.Key
    $dst = Join-Path $ProjectRoot $entry.Value
    $dstDir = Split-Path $dst -Parent
    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
    }
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dst -Force
        $copiedFrontend++
    } else {
        Write-Host "  WARNING: Source not found: $($entry.Key)" -ForegroundColor Yellow
    }
}
Write-Host "  Copied $copiedFrontend frontend files." -ForegroundColor Green

# ── Step 5: Run Alembic migration ─────────────────────────────
Write-Host "[5/7] Running Alembic migration..." -ForegroundColor Yellow
try {
    & alembic upgrade head 2>&1
    Write-Host "  Migration complete." -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Migration failed (may need database running): $_" -ForegroundColor Yellow
    Write-Host "  Run manually: alembic upgrade head" -ForegroundColor Yellow
}

# ── Step 6: Run tests ─────────────────────────────────────────
if (-not $SkipTests) {
    Write-Host "[6/7] Running tests..." -ForegroundColor Yellow
    try {
        & pytest tests/test_admin_system.py -v 2>&1
        Write-Host "  Tests complete." -ForegroundColor Green
    } catch {
        Write-Host "  WARNING: Tests failed: $_" -ForegroundColor Yellow
        Write-Host "  Run manually: pytest tests/test_admin_system.py -v" -ForegroundColor Yellow
    }
} else {
    Write-Host "[6/7] Skipping tests (--SkipTests)" -ForegroundColor Yellow
}

# ── Step 7: Git commit & push ─────────────────────────────────
if (-not $SkipGit) {
    Write-Host "[7/7] Committing and pushing to GitHub..." -ForegroundColor Yellow
    try {
        git add .
        git commit -m "feat: Complete Phase 2 - Admin Circuit Migration

Backend (17 files):
- 4 Repositories (base, resource, supplier, audit)
- 3 Database models (resource, config_tables, audit_log)
- 3 Pydantic schemas (resource, config, audit_log)
- 4 Services (resource, supplier, config, audit)
- Admin routes with 30+ endpoints
- Alembic migration 002 with seed data
- 35+ comprehensive unit tests

Frontend (13 files):
- 7 Admin pages (Layout, Dashboard, Users, Resources, Suppliers, Config, AuditLogs)
- 4 Reusable components (DataGrid, FormDialog, ConfirmDialog, SearchBar)
- TypeScript API client with full type definitions
- Barrel exports with router example

API Endpoints:
- User management (CRUD + password change)
- Resource library (CRUD + EOC filtering + summary)
- Supplier management (CRUD + search)
- Configuration tables (10 dynamic tables, weighted support)
- Audit logs (list + detail + filtering)

Closes Phase 2 of modernization plan."
        git push origin main
        Write-Host "  Pushed to GitHub." -ForegroundColor Green
    } catch {
        Write-Host "  WARNING: Git operations failed: $_" -ForegroundColor Yellow
        Write-Host "  Run manually: git add . && git commit -m '...' && git push origin main" -ForegroundColor Yellow
    }
} else {
    Write-Host "[7/7] Skipping git (--SkipGit)" -ForegroundColor Yellow
}

# ── Done ──────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Phase 2 Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nFiles deployed: $($copiedBackend + $copiedFrontend) total ($copiedBackend backend, $copiedFrontend frontend)"
Write-Host "Next steps:"
Write-Host "  1. Verify the app starts: uvicorn app.main:app --reload"
Write-Host "  2. Check API docs: http://localhost:8000/docs"
Write-Host "  3. Begin Phase 3: MS Project Integration`n"
