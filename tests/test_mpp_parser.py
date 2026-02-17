"""
Tests for the enhanced MPP parser (app.services.mpp_parser).

These tests use mock objects to simulate MPXJ/JPype behavior,
so they run without requiring Java or the MPXJ JAR.
"""
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from app.services.mpp_parser import (
    MPPParser,
    ParsedAssignment,
    ParsedProject,
    ParsedResource,
    ParsedTask,
)


class TestParsedDataclasses:
    """Test parsed data structures."""

    def test_parsed_task_defaults(self):
        task = ParsedTask(unique_id=1, name="Task 1")
        assert task.unique_id == 1
        assert task.name == "Task 1"
        assert task.outline_level == 0
        assert task.parent_unique_id is None
        assert task.is_milestone is False
        assert task.is_summary is False
        assert task.is_critical is False
        assert task.percent_complete == 0.0

    def test_parsed_task_full(self):
        task = ParsedTask(
            unique_id=5,
            name="Build Phase",
            wbs_code="1.2",
            outline_level=2,
            parent_unique_id=3,
            start=datetime(2024, 1, 1),
            finish=datetime(2024, 6, 30),
            duration=130.0,
            duration_units="DAYS",
            percent_complete=45.5,
            is_milestone=False,
            is_summary=True,
            is_critical=True,
            resource_names="Alice, Bob",
            notes="Important phase",
        )
        assert task.wbs_code == "1.2"
        assert task.outline_level == 2
        assert task.parent_unique_id == 3
        assert task.is_summary is True
        assert task.is_critical is True
        assert task.resource_names == "Alice, Bob"

    def test_parsed_resource_defaults(self):
        resource = ParsedResource(unique_id=1, name="Engineer")
        assert resource.email is None
        assert resource.standard_rate is None

    def test_parsed_assignment(self):
        assignment = ParsedAssignment(
            task_unique_id=1,
            resource_unique_id=2,
            work=40.0,
            units=1.0,
            cost=3000.0,
        )
        assert assignment.task_unique_id == 1
        assert assignment.cost == 3000.0

    def test_parsed_project_defaults(self):
        project = ParsedProject(name="Test")
        assert project.tasks == []
        assert project.resources == []
        assert project.assignments == []
        assert project.start_date is None


class TestMPPParserConversions:
    """Test Java->Python conversion utilities."""

    def test_str_none(self):
        assert MPPParser._str(None) is None

    def test_str_empty(self):
        assert MPPParser._str("") is None
        assert MPPParser._str("   ") is None

    def test_str_value(self):
        assert MPPParser._str("Hello") == "Hello"
        assert MPPParser._str("  trimmed  ") == "trimmed"

    def test_to_datetime_none(self):
        assert MPPParser._to_datetime(None) is None

    def test_to_datetime_java_date(self):
        mock_date = MagicMock()
        # Simulate Java Date with getTime() returning epoch millis
        # 2024-01-15 12:00:00 UTC = 1705320000000 ms
        mock_date.getTime.return_value = 1705320000000
        result = MPPParser._to_datetime(mock_date)
        assert result is not None
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15

    def test_to_datetime_invalid(self):
        mock_obj = MagicMock()
        mock_obj.getTime.side_effect = Exception("not a date")
        del mock_obj.getTime
        mock_obj.__str__ = lambda self: "not a date"
        result = MPPParser._to_datetime(mock_obj)
        assert result is None

    def test_to_float_none(self):
        assert MPPParser._to_float(None) is None

    def test_to_float_with_float_value(self):
        mock_num = MagicMock()
        mock_num.floatValue.return_value = 42.5
        assert MPPParser._to_float(mock_num) == 42.5

    def test_to_float_with_double_value(self):
        mock_num = MagicMock(spec=[])
        mock_num.doubleValue = MagicMock(return_value=99.9)
        # Remove floatValue so it falls through
        assert MPPParser._to_float(mock_num) is not None

    def test_to_float_plain_number(self):
        assert MPPParser._to_float(3.14) == 3.14
        assert MPPParser._to_float(42) == 42.0

    def test_to_float_invalid(self):
        assert MPPParser._to_float("not a number") is None


class TestMPPParserExtraction:
    """Test task/resource/assignment extraction with mocked MPXJ objects."""

    @pytest.fixture
    def parser(self):
        """Create parser with JVM startup mocked."""
        with patch("app.services.mpp_parser.jpype") as mock_jpype:
            mock_jpype.isJVMStarted.return_value = True
            return MPPParser()

    def _make_mock_task(
        self,
        unique_id=1,
        name="Task",
        wbs="1.0",
        outline_level=0,
        parent=None,
        start=None,
        finish=None,
        milestone=False,
        summary=False,
        critical=False,
        percent_complete=0.0,
    ):
        task = MagicMock()
        task.getUniqueID.return_value = unique_id
        task.getName.return_value = name
        task.getWBS.return_value = wbs
        task.getOutlineLevel.return_value = outline_level
        task.getParentTask.return_value = parent
        task.getStart.return_value = start
        task.getFinish.return_value = finish
        task.getBaselineStart.return_value = None
        task.getBaselineFinish.return_value = None
        task.getLateStart.return_value = None
        task.getLateFinish.return_value = None
        task.getActualStart.return_value = None
        task.getActualFinish.return_value = None
        task.getDuration.return_value = None
        task.getPercentageComplete.return_value = percent_complete
        task.getCost.return_value = None
        task.getBaselineCost.return_value = None
        task.getMilestone.return_value = milestone
        task.getSummary.return_value = summary
        task.getCritical.return_value = critical
        task.getNotes.return_value = None

        # Empty resource assignments
        assignments = MagicMock()
        assignments.size.return_value = 0
        assignments.__iter__ = MagicMock(return_value=iter([]))
        task.getResourceAssignments.return_value = assignments

        return task

    def test_extract_tasks_basic(self, parser):
        parent_task = self._make_mock_task(
            unique_id=1, name="Summary", wbs="1", outline_level=0, summary=True
        )

        child_task = self._make_mock_task(
            unique_id=2,
            name="Child Task",
            wbs="1.1",
            outline_level=1,
            parent=parent_task,
            milestone=True,
        )

        project = MagicMock()
        project.getTasks.return_value = [parent_task, child_task]

        result = parser._extract_tasks(project)
        assert len(result) == 2

        assert result[0].unique_id == 1
        assert result[0].name == "Summary"
        assert result[0].is_summary is True
        assert result[0].parent_unique_id is None

        assert result[1].unique_id == 2
        assert result[1].name == "Child Task"
        assert result[1].parent_unique_id == 1
        assert result[1].is_milestone is True

    def test_extract_tasks_skips_null_unique_id(self, parser):
        task = MagicMock()
        task.getUniqueID.return_value = None

        project = MagicMock()
        project.getTasks.return_value = [task]

        result = parser._extract_tasks(project)
        assert len(result) == 0

    def test_extract_resources(self, parser):
        resource = MagicMock()
        resource.getUniqueID.return_value = 1
        resource.getName.return_value = "Alice"
        resource.getType.return_value = "Work"
        resource.getEmailAddress.return_value = "alice@example.com"
        resource.getStandardRate.return_value = None
        resource.getOvertimeRate.return_value = None

        project = MagicMock()
        project.getResources.return_value = [resource]

        result = parser._extract_resources(project)
        assert len(result) == 1
        assert result[0].name == "Alice"
        assert result[0].email == "alice@example.com"

    def test_extract_resources_skips_unnamed(self, parser):
        resource = MagicMock()
        resource.getUniqueID.return_value = 1
        resource.getName.return_value = None

        project = MagicMock()
        project.getResources.return_value = [resource]

        result = parser._extract_resources(project)
        assert len(result) == 0

    def test_extract_assignments(self, parser):
        mock_task = MagicMock()
        mock_task.getUniqueID.return_value = 10
        mock_resource = MagicMock()
        mock_resource.getUniqueID.return_value = 20

        assignment = MagicMock()
        assignment.getTask.return_value = mock_task
        assignment.getResource.return_value = mock_resource
        assignment.getWork.return_value = None
        assignment.getUnits.return_value = None
        assignment.getCost.return_value = None

        project = MagicMock()
        project.getResourceAssignments.return_value = [assignment]

        result = parser._extract_assignments(project)
        assert len(result) == 1
        assert result[0].task_unique_id == 10
        assert result[0].resource_unique_id == 20

    def test_extract_assignments_skips_null_task(self, parser):
        assignment = MagicMock()
        assignment.getTask.return_value = None
        assignment.getResource.return_value = MagicMock()

        project = MagicMock()
        project.getResourceAssignments.return_value = [assignment]

        result = parser._extract_assignments(project)
        assert len(result) == 0
