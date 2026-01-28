"""
Tests for the import service (app.services.import_service).

Uses mocked S3, parser, and database to test the import lifecycle.
"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime

from app.services.import_service import ImportService
from app.models.database.import_job import ImportJob, ImportStatus
from app.models.database.project import Project, ProjectStatus, ProjectSourceFormat
from app.services.mpp_parser import ParsedProject, ParsedTask, ParsedResource, ParsedAssignment


class TestImportServiceProcessImport:
    """Test the process_import (Celery worker) flow."""

    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        db.get = MagicMock()
        return db

    @pytest.fixture
    def service(self, mock_db):
        with patch("app.services.import_service.ImportJobRepository") as MockImportRepo, \
             patch("app.services.import_service.WBSRepository") as MockWBSRepo, \
             patch("app.services.import_service.ProjectRepository") as MockProjectRepo:
            svc = ImportService(mock_db)
            svc.import_repo = MockImportRepo.return_value
            svc.wbs_repo = MockWBSRepo.return_value
            svc.project_repo = MockProjectRepo.return_value
            return svc

    def _make_job(self, job_id=1, project_id=1, status=ImportStatus.PENDING):
        job = MagicMock(spec=ImportJob)
        job.id = job_id
        job.project_id = project_id
        job.user_id = 1
        job.filename = "test.mpp"
        job.s3_key = "projects/1/20240101_test.mpp"
        job.file_size = 5000
        job.status = status
        return job

    def _make_project(self, project_id=1):
        project = MagicMock(spec=Project)
        project.id = project_id
        project.project_name = "Test Project"
        project.status = ProjectStatus.IMPORTING
        return project

    def _make_parsed_project(self):
        return ParsedProject(
            name="Test Project",
            start_date=datetime(2024, 1, 1),
            finish_date=datetime(2024, 12, 31),
            tasks=[
                ParsedTask(
                    unique_id=1, name="Summary Task",
                    wbs_code="1", outline_level=0,
                    is_summary=True,
                ),
                ParsedTask(
                    unique_id=2, name="Child Task",
                    wbs_code="1.1", outline_level=1,
                    parent_unique_id=1,
                    percent_complete=50.0,
                    is_critical=True,
                ),
            ],
            resources=[
                ParsedResource(unique_id=1, name="Alice", resource_type="Work"),
            ],
            assignments=[
                ParsedAssignment(task_unique_id=2, resource_unique_id=1, cost=5000.0),
            ],
        )

    @patch("app.services.import_service.MPPParser")
    def test_process_import_success(self, MockParser, service, mock_db):
        """Test successful import end-to-end."""
        job = self._make_job()
        project = self._make_project()

        service.import_repo.get.return_value = job
        service.project_repo.get.return_value = project

        # Mock S3 download
        service._download_from_s3 = MagicMock(return_value=b"fake file contents")

        # Mock parser
        parsed = self._make_parsed_project()
        mock_parser_instance = MockParser.return_value
        mock_parser_instance.parse.return_value = parsed

        # Mock WBS creation (flush gives ID)
        wbs_id_counter = [0]
        def mock_flush():
            pass
        mock_db.flush = mock_flush

        # Create mock WBS objects that get IDs after add
        from app.models.database.wbs import WBS
        mock_wbs_items = []
        def mock_add(item):
            wbs_id_counter[0] += 1
            item.id = wbs_id_counter[0]
            mock_wbs_items.append(item)
        mock_db.add = mock_add
        mock_db.get = lambda model, id: next((w for w in mock_wbs_items if w.id == id), None)

        service.process_import(job.id)

        # Verify parser was called
        mock_parser_instance.parse.assert_called_once_with(b"fake file contents", "test.mpp")

        # Verify old WBS items were deleted
        service.wbs_repo.delete_by_project.assert_called_once_with(1)

        # Verify project was updated with metadata
        project_update_calls = service.project_repo.update.call_args_list
        # Last update should set status to IMPORTED
        last_update = project_update_calls[-1]
        update_data = last_update[0][1]
        assert update_data["status"] == ProjectStatus.IMPORTED
        assert update_data["task_count"] == 2
        assert update_data["resource_count"] == 1

    def test_process_import_job_not_found(self, service):
        """Test that missing job is handled gracefully."""
        service.import_repo.get.return_value = None
        service.process_import(999)
        # Should return without error
        service.project_repo.get.assert_not_called()

    def test_process_import_project_not_found(self, service):
        """Test that missing project marks job as failed."""
        job = self._make_job()
        service.import_repo.get.return_value = job
        service.project_repo.get.return_value = None

        service.process_import(job.id)

        # Job should be marked as failed
        fail_call = service.import_repo.update.call_args_list[-1]
        update_data = fail_call[0][1]
        assert update_data["status"] == ImportStatus.FAILED
        assert "Project not found" in update_data["error_message"]

    def test_process_import_s3_download_failure(self, service, mock_db):
        """Test that S3 download failure marks job as failed."""
        job = self._make_job()
        project = self._make_project()

        service.import_repo.get.return_value = job
        service.project_repo.get.return_value = project
        service._download_from_s3 = MagicMock(return_value=None)

        service.process_import(job.id)

        # Job should be marked as failed
        fail_call = service.import_repo.update.call_args_list[-1]
        update_data = fail_call[0][1]
        assert update_data["status"] == ImportStatus.FAILED
        assert "S3" in update_data["error_message"]

    @patch("app.services.import_service.MPPParser")
    def test_process_import_parser_failure(self, MockParser, service, mock_db):
        """Test that parser failure marks job as failed and project as import_failed."""
        job = self._make_job()
        project = self._make_project()

        service.import_repo.get.return_value = job
        service.project_repo.get.return_value = project
        service._download_from_s3 = MagicMock(return_value=b"bad file")

        mock_parser_instance = MockParser.return_value
        mock_parser_instance.parse.side_effect = Exception("Parse error")

        service.process_import(job.id)

        # Job should be failed
        fail_call = service.import_repo.update.call_args_list[-1]
        update_data = fail_call[0][1]
        assert update_data["status"] == ImportStatus.FAILED

        # Project should be set to IMPORT_FAILED
        project_update_calls = service.project_repo.update.call_args_list
        last_project_update = project_update_calls[-1]
        assert last_project_update[0][1]["status"] == ProjectStatus.IMPORT_FAILED


class TestImportServiceStatus:
    """Test status query methods."""

    @pytest.fixture
    def service(self):
        mock_db = MagicMock()
        with patch("app.services.import_service.ImportJobRepository") as MockImportRepo, \
             patch("app.services.import_service.WBSRepository"), \
             patch("app.services.import_service.ProjectRepository"):
            svc = ImportService(mock_db)
            svc.import_repo = MockImportRepo.return_value
            return svc

    def test_get_import_status(self, service):
        mock_job = MagicMock()
        service.import_repo.get.return_value = mock_job
        result = service.get_import_status(1)
        assert result == mock_job

    def test_get_project_imports(self, service):
        mock_jobs = [MagicMock(), MagicMock()]
        service.import_repo.get_by_project.return_value = mock_jobs
        result = service.get_project_imports(1)
        assert len(result) == 2
