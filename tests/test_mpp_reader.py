import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.mpp_reader import MPPReader
import jpype


class TestMPPReader:
    """Tests for MPP Reader service"""

    @pytest.fixture
    def reader(self):
        """Create MPPReader instance"""
        return MPPReader()

    @pytest.fixture
    def mock_jpype(self):
        """Mock JPype to avoid Java dependencies in tests"""
        with patch('app.services.mpp_reader.jpype') as mock:
            mock.isJVMStarted.return_value = True
            yield mock

    def test_init_jvm_already_started(self, reader, mock_jpype):
        """Test JVM initialization when already started"""
        mock_jpype.isJVMStarted.return_value = True
        reader.init_jvm()
        mock_jpype.startJVM.assert_not_called()

    def test_init_jvm_not_started(self, reader, mock_jpype):
        """Test JVM initialization when not started"""
        mock_jpype.isJVMStarted.return_value = False
        mock_jpype.getDefaultJVMPath.return_value = "/usr/lib/jvm/java/jre/lib/amd64/server/libjvm.so"

        reader.init_jvm()

        mock_jpype.startJVM.assert_called_once()

    @patch('app.services.mpp_reader.jpype')
    def test_parse_valid_file(self, mock_jpype, reader, sample_mpp_data):
        """Test parsing a valid project file"""
        # Mock JPype and Java classes
        mock_jpype.isJVMStarted.return_value = True

        # Mock UniversalProjectReader
        mock_reader_class = MagicMock()
        mock_project_reader = MagicMock()
        mock_reader_class.return_value = mock_project_reader

        # Mock Project
        mock_project = MagicMock()
        mock_project.getName.return_value = "Test Project"
        mock_project.getStartDate.return_value = None
        mock_project.getFinishDate.return_value = None
        mock_project.getTasks.return_value = []
        mock_project.getResources.return_value = []

        mock_project_reader.read.return_value = mock_project

        with patch('app.services.mpp_reader.jpype.JClass', return_value=mock_reader_class):
            # Test parsing
            file_content = b"fake mpp content"
            result = reader.parse(file_content, "test.mpp")

            assert result is not None
            assert "name" in result
            assert result["name"] == "Test Project"
            assert "tasks" in result
            assert "resources" in result

    def test_parse_invalid_file_type(self, reader):
        """Test parsing with invalid file type"""
        with pytest.raises(ValueError, match="Unsupported file type"):
            reader.parse(b"content", "test.invalid")

    def test_parse_empty_content(self, reader, mock_jpype):
        """Test parsing with empty content"""
        with pytest.raises(ValueError, match="File content cannot be empty"):
            reader.parse(b"", "test.mpp")

    @patch('app.services.mpp_reader.jpype')
    def test_extract_task_data(self, mock_jpype, reader):
        """Test task data extraction"""
        mock_task = MagicMock()
        mock_task.getName.return_value = "Test Task"
        mock_task.getID.return_value = 1
        mock_task.getDuration.return_value = None
        mock_task.getStart.return_value = None
        mock_task.getFinish.return_value = None
        mock_task.getPercentageComplete.return_value = None
        mock_task.getNotes.return_value = None

        result = reader._extract_task_data(mock_task)

        assert result["name"] == "Test Task"
        assert result["id"] == 1
        assert "duration" in result
        assert "start" in result
        assert "finish" in result

    @patch('app.services.mpp_reader.jpype')
    def test_extract_resource_data(self, mock_jpype, reader):
        """Test resource data extraction"""
        mock_resource = MagicMock()
        mock_resource.getName.return_value = "Test Resource"
        mock_resource.getID.return_value = 1
        mock_resource.getEmailAddress.return_value = "test@example.com"
        mock_resource.getType.return_value = None

        result = reader._extract_resource_data(mock_resource)

        assert result["name"] == "Test Resource"
        assert result["id"] == 1
        assert result["email_address"] == "test@example.com"

    def test_parse_handles_exceptions(self, reader, mock_jpype):
        """Test that parse handles exceptions gracefully"""
        mock_jpype.isJVMStarted.return_value = True

        with patch('app.services.mpp_reader.jpype.JClass', side_effect=Exception("Java error")):
            with pytest.raises(Exception):
                reader.parse(b"content", "test.mpp")

    def test_supported_file_extensions(self, reader):
        """Test that correct file extensions are supported"""
        assert reader.parse.__doc__ is not None

        # These should not raise ValueError for file type
        valid_extensions = ["test.mpp", "test.mpx", "test.xml", "TEST.MPP"]

        for filename in valid_extensions:
            try:
                # Will fail for other reasons, but not file type
                reader.parse(b"content", filename)
            except ValueError as e:
                if "Unsupported file type" in str(e):
                    pytest.fail(f"File type {filename} should be supported")
            except Exception:
                # Other exceptions are fine for this test
                pass
