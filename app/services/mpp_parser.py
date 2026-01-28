"""
Enhanced MS Project file parser using MPXJ via JPype1.

Extracts full project data including hierarchy, baselines, late dates,
duration, flags, resources, and assignments into pure dataclasses
(no database coupling).
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

import jpype
import jpype.imports

from app.core.config import settings

logger = logging.getLogger(__name__)


# ============================================================
# Parsed data structures (pure data, no DB coupling)
# ============================================================

@dataclass
class ParsedTask:
    """A single task/WBS item extracted from an MS Project file."""
    unique_id: int
    name: str
    wbs_code: Optional[str] = None
    outline_level: int = 0
    parent_unique_id: Optional[int] = None

    # Schedule dates
    start: Optional[datetime] = None
    finish: Optional[datetime] = None
    baseline_start: Optional[datetime] = None
    baseline_finish: Optional[datetime] = None
    late_start: Optional[datetime] = None
    late_finish: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_finish: Optional[datetime] = None

    # Duration
    duration: Optional[float] = None
    duration_units: Optional[str] = None

    # Progress & cost
    percent_complete: float = 0.0
    cost: float = 0.0
    baseline_cost: float = 0.0

    # Flags
    is_milestone: bool = False
    is_summary: bool = False
    is_critical: bool = False

    # Display
    resource_names: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class ParsedResource:
    """A resource extracted from an MS Project file."""
    unique_id: int
    name: str
    resource_type: Optional[str] = None
    email: Optional[str] = None
    standard_rate: Optional[float] = None
    overtime_rate: Optional[float] = None


@dataclass
class ParsedAssignment:
    """A resource assignment extracted from an MS Project file."""
    task_unique_id: int
    resource_unique_id: int
    work: Optional[float] = None
    units: Optional[float] = None
    cost: float = 0.0


@dataclass
class ParsedProject:
    """Complete parsed project data."""
    name: str
    start_date: Optional[datetime] = None
    finish_date: Optional[datetime] = None
    baseline_start: Optional[datetime] = None
    baseline_finish: Optional[datetime] = None
    tasks: List[ParsedTask] = field(default_factory=list)
    resources: List[ParsedResource] = field(default_factory=list)
    assignments: List[ParsedAssignment] = field(default_factory=list)


# ============================================================
# Parser
# ============================================================

class MPPParser:
    """
    Enhanced MS Project parser.

    Uses MPXJ (via JPype1) to read .mpp, .mpx, and .xml files
    and extract full project data including hierarchy, baselines,
    and task classification flags.
    """

    def __init__(self):
        self._ensure_jvm()

    @staticmethod
    def _ensure_jvm():
        """Start JVM with MPXJ JAR if not already running."""
        if not jpype.isJVMStarted():
            jar_path = settings.MPXJ_JAR_PATH
            logger.info("Starting JVM with MPXJ JAR: %s", jar_path)
            jpype.startJVM(classpath=[jar_path])

    def parse(self, file_contents: bytes, filename: str) -> ParsedProject:
        """
        Parse an MS Project file and return structured data.

        Args:
            file_contents: Raw bytes of the project file.
            filename: Original filename (used for format detection).

        Returns:
            ParsedProject with tasks, resources, and assignments.
        """
        from net.sf.mpxj.reader import UniversalProjectReader

        reader = UniversalProjectReader()
        byte_array = jpype.JArray(jpype.JByte)(file_contents)
        input_stream = jpype.java.io.ByteArrayInputStream(byte_array)

        project = reader.read(input_stream)
        props = project.getProjectProperties()

        parsed = ParsedProject(
            name=self._str(props.getName()) or filename,
            start_date=self._to_datetime(props.getStartDate()),
            finish_date=self._to_datetime(props.getFinishDate()),
            baseline_start=self._to_datetime(props.getBaselineStart()),
            baseline_finish=self._to_datetime(props.getBaselineFinish()),
        )

        parsed.tasks = self._extract_tasks(project)
        parsed.resources = self._extract_resources(project)
        parsed.assignments = self._extract_assignments(project)

        logger.info(
            "Parsed '%s': %d tasks, %d resources, %d assignments",
            parsed.name, len(parsed.tasks), len(parsed.resources), len(parsed.assignments),
        )
        return parsed

    # --------------------------------------------------------
    # Extraction helpers
    # --------------------------------------------------------

    def _extract_tasks(self, project) -> List[ParsedTask]:
        """Extract all tasks with hierarchy, dates, and flags."""
        tasks: List[ParsedTask] = []

        for task in project.getTasks():
            unique_id = task.getUniqueID()
            if unique_id is None:
                continue

            uid = int(unique_id)

            # Determine parent unique ID
            parent_uid = None
            parent_task = task.getParentTask()
            if parent_task is not None and parent_task.getUniqueID() is not None:
                parent_uid = int(parent_task.getUniqueID())

            # Duration
            dur_val = None
            dur_units = None
            duration_obj = task.getDuration()
            if duration_obj is not None:
                dur_val = self._to_float(duration_obj.getDuration())
                time_unit = duration_obj.getUnits()
                dur_units = self._str(time_unit) if time_unit else None

            # Resource names (comma-separated display string)
            resource_names = None
            assignments = task.getResourceAssignments()
            if assignments is not None and assignments.size() > 0:
                names = []
                for ra in assignments:
                    res = ra.getResource()
                    if res is not None:
                        rn = self._str(res.getName())
                        if rn:
                            names.append(rn)
                if names:
                    resource_names = ", ".join(names)

            tasks.append(ParsedTask(
                unique_id=uid,
                name=self._str(task.getName()) or f"Task {uid}",
                wbs_code=self._str(task.getWBS()),
                outline_level=int(task.getOutlineLevel()) if task.getOutlineLevel() is not None else 0,
                parent_unique_id=parent_uid,
                start=self._to_datetime(task.getStart()),
                finish=self._to_datetime(task.getFinish()),
                baseline_start=self._to_datetime(task.getBaselineStart()),
                baseline_finish=self._to_datetime(task.getBaselineFinish()),
                late_start=self._to_datetime(task.getLateStart()),
                late_finish=self._to_datetime(task.getLateFinish()),
                actual_start=self._to_datetime(task.getActualStart()),
                actual_finish=self._to_datetime(task.getActualFinish()),
                duration=dur_val,
                duration_units=dur_units,
                percent_complete=self._to_float(task.getPercentageComplete()) or 0.0,
                cost=self._to_float(task.getCost()) or 0.0,
                baseline_cost=self._to_float(task.getBaselineCost()) or 0.0,
                is_milestone=bool(task.getMilestone()) if task.getMilestone() is not None else False,
                is_summary=bool(task.getSummary()) if task.getSummary() is not None else False,
                is_critical=bool(task.getCritical()) if task.getCritical() is not None else False,
                resource_names=resource_names,
                notes=self._str(task.getNotes()),
            ))

        return tasks

    def _extract_resources(self, project) -> List[ParsedResource]:
        """Extract all resources."""
        resources: List[ParsedResource] = []

        for resource in project.getResources():
            unique_id = resource.getUniqueID()
            if unique_id is None:
                continue

            uid = int(unique_id)
            name = self._str(resource.getName())
            if not name:
                continue

            resources.append(ParsedResource(
                unique_id=uid,
                name=name,
                resource_type=self._str(resource.getType()),
                email=self._str(resource.getEmailAddress()),
                standard_rate=self._to_float(resource.getStandardRate()),
                overtime_rate=self._to_float(resource.getOvertimeRate()),
            ))

        return resources

    def _extract_assignments(self, project) -> List[ParsedAssignment]:
        """Extract all resource assignments."""
        assignments: List[ParsedAssignment] = []

        for ra in project.getResourceAssignments():
            task = ra.getTask()
            resource = ra.getResource()

            if task is None or resource is None:
                continue
            if task.getUniqueID() is None or resource.getUniqueID() is None:
                continue

            # Work in hours
            work_val = None
            work_obj = ra.getWork()
            if work_obj is not None:
                work_val = self._to_float(work_obj.getDuration())

            assignments.append(ParsedAssignment(
                task_unique_id=int(task.getUniqueID()),
                resource_unique_id=int(resource.getUniqueID()),
                work=work_val,
                units=self._to_float(ra.getUnits()),
                cost=self._to_float(ra.getCost()) or 0.0,
            ))

        return assignments

    # --------------------------------------------------------
    # Java -> Python conversion utilities
    # --------------------------------------------------------

    @staticmethod
    def _str(java_obj) -> Optional[str]:
        """Convert a Java object to a Python string, or None."""
        if java_obj is None:
            return None
        s = str(java_obj).strip()
        return s if s else None

    @staticmethod
    def _to_datetime(java_date) -> Optional[datetime]:
        """Convert a Java Date to a Python datetime, or None."""
        if java_date is None:
            return None
        try:
            # MPXJ returns java.util.Date or LocalDateTime
            # Convert via epoch millis
            if hasattr(java_date, 'getTime'):
                millis = java_date.getTime()
                return datetime.utcfromtimestamp(millis / 1000.0)
            # Fallback: parse string representation
            return datetime.fromisoformat(str(java_date))
        except (ValueError, TypeError, OverflowError):
            return None

    @staticmethod
    def _to_float(java_number) -> Optional[float]:
        """Convert a Java Number to a Python float, or None."""
        if java_number is None:
            return None
        try:
            if hasattr(java_number, 'floatValue'):
                return float(java_number.floatValue())
            if hasattr(java_number, 'doubleValue'):
                return float(java_number.doubleValue())
            return float(java_number)
        except (ValueError, TypeError):
            return None
