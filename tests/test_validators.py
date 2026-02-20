"""
Comprehensive tests for the validators module.
"""
from app.utils.validators import (
    DEFAULT_MAX_FILE_SIZE,
    MIN_FILE_SIZE,
    get_content_type,
    sanitize_filename,
    validate_email,
    validate_file,
    validate_file_extension,
    validate_file_size,
    validate_positive_integer,
    validate_project_name,
    validate_uuid,
)


class TestValidateFileExtension:
    """Tests for validate_file_extension function."""

    def test_valid_mpp_extension(self):
        """Test that .mpp extension is valid."""
        is_valid, msg = validate_file_extension("project.mpp")
        assert is_valid is True
        assert "Valid" in msg

    def test_valid_mpx_extension(self):
        """Test that .mpx extension is valid."""
        is_valid, msg = validate_file_extension("project.mpx")
        assert is_valid is True

    def test_valid_xml_extension(self):
        """Test that .xml extension is valid."""
        is_valid, msg = validate_file_extension("project.xml")
        assert is_valid is True

    def test_uppercase_extension(self):
        """Test that uppercase extensions are valid."""
        is_valid, msg = validate_file_extension("project.MPP")
        assert is_valid is True

    def test_mixed_case_extension(self):
        """Test that mixed case extensions are valid."""
        is_valid, msg = validate_file_extension("project.MpP")
        assert is_valid is True

    def test_invalid_extension(self):
        """Test that invalid extensions are rejected."""
        is_valid, msg = validate_file_extension("project.txt")
        assert is_valid is False
        assert "Invalid file type" in msg

    def test_no_extension(self):
        """Test that files without extensions are rejected."""
        is_valid, msg = validate_file_extension("project")
        assert is_valid is False
        assert "no extension" in msg

    def test_empty_filename(self):
        """Test that empty filenames are rejected."""
        is_valid, msg = validate_file_extension("")
        assert is_valid is False
        assert "empty" in msg.lower()

    def test_custom_extensions(self):
        """Test custom extension list."""
        is_valid, msg = validate_file_extension("file.pdf", [".pdf", ".doc"])
        assert is_valid is True

    def test_extension_without_dot(self):
        """Test custom extensions without leading dot."""
        is_valid, msg = validate_file_extension("file.pdf", ["pdf", "doc"])
        assert is_valid is True


class TestValidateFileSize:
    """Tests for validate_file_size function."""

    def test_valid_file_size(self):
        """Test that normal file sizes are valid."""
        is_valid, msg = validate_file_size(1024 * 1024)  # 1 MB
        assert is_valid is True

    def test_minimum_file_size(self):
        """Test that minimum file size is enforced."""
        is_valid, msg = validate_file_size(MIN_FILE_SIZE)
        assert is_valid is True

    def test_below_minimum_file_size(self):
        """Test that files below minimum are rejected."""
        is_valid, msg = validate_file_size(10)
        assert is_valid is False
        assert "too small" in msg.lower()

    def test_maximum_file_size(self):
        """Test that maximum file size is enforced."""
        is_valid, msg = validate_file_size(DEFAULT_MAX_FILE_SIZE)
        assert is_valid is True

    def test_above_maximum_file_size(self):
        """Test that files above maximum are rejected."""
        is_valid, msg = validate_file_size(DEFAULT_MAX_FILE_SIZE + 1)
        assert is_valid is False
        assert "too large" in msg.lower()

    def test_custom_max_size(self):
        """Test custom maximum size."""
        is_valid, msg = validate_file_size(2000, max_size=1000)
        assert is_valid is False

    def test_custom_min_size(self):
        """Test custom minimum size."""
        is_valid, msg = validate_file_size(50, min_size=100)
        assert is_valid is False


class TestSanitizeFilename:
    """Tests for sanitize_filename function."""

    def test_normal_filename(self):
        """Test that normal filenames are unchanged."""
        result = sanitize_filename("project.mpp")
        assert result == "project.mpp"

    def test_path_traversal_dots(self):
        """Test that path traversal with dots is removed."""
        result = sanitize_filename("../../../etc/passwd")
        assert ".." not in result
        assert result == "passwd"

    def test_path_traversal_slashes(self):
        """Test that path traversal with slashes is handled."""
        result = sanitize_filename("/tmp/evil/file.mpp")
        assert result == "file.mpp"

    def test_backslashes(self):
        """Test that Windows backslashes are handled."""
        result = sanitize_filename("C:\\Users\\test\\file.mpp")
        assert result == "file.mpp"

    def test_special_characters(self):
        """Test that special characters are replaced."""
        result = sanitize_filename('file<>:"|?*.mpp')
        assert "<" not in result
        assert ">" not in result

    def test_unicode_characters(self):
        """Test that unicode characters are handled."""
        result = sanitize_filename("项目文件.mpp")
        # Non-ASCII replaced with underscores; basename + strip may drop them
        assert result  # Should produce a non-empty result
        assert ".." not in result  # No path traversal

    def test_empty_filename(self):
        """Test that empty filenames get a default."""
        result = sanitize_filename("")
        assert result == "unnamed_file"

    def test_only_special_chars(self):
        """Test filename with only special characters."""
        result = sanitize_filename("***")
        assert result == "unnamed_file"

    def test_multiple_underscores(self):
        """Test that multiple underscores are collapsed."""
        result = sanitize_filename("file___name.mpp")
        assert "___" not in result

    def test_spaces(self):
        """Test that spaces are handled."""
        result = sanitize_filename("my project file.mpp")
        assert "  " not in result


class TestValidateProjectName:
    """Tests for validate_project_name function."""

    def test_valid_project_name(self):
        """Test that valid project names are accepted."""
        is_valid, msg = validate_project_name("My Project 2024")
        assert is_valid is True

    def test_empty_project_name(self):
        """Test that empty project names are rejected."""
        is_valid, msg = validate_project_name("")
        assert is_valid is False
        assert "empty" in msg.lower()

    def test_whitespace_only_name(self):
        """Test that whitespace-only names are rejected."""
        is_valid, msg = validate_project_name("   ")
        assert is_valid is False

    def test_long_project_name(self):
        """Test that very long names are rejected."""
        is_valid, msg = validate_project_name("x" * 300)
        assert is_valid is False
        assert "too long" in msg.lower()

    def test_custom_max_length(self):
        """Test custom maximum length."""
        is_valid, msg = validate_project_name("12345678901", max_length=10)
        assert is_valid is False


class TestValidateEmail:
    """Tests for validate_email function."""

    def test_valid_email(self):
        """Test that valid emails are accepted."""
        is_valid, msg = validate_email("user@example.com")
        assert is_valid is True

    def test_valid_email_with_dots(self):
        """Test email with dots in local part."""
        is_valid, msg = validate_email("user.name@example.com")
        assert is_valid is True

    def test_valid_email_with_plus(self):
        """Test email with plus sign."""
        is_valid, msg = validate_email("user+tag@example.com")
        assert is_valid is True

    def test_invalid_email_no_at(self):
        """Test that emails without @ are rejected."""
        is_valid, msg = validate_email("userexample.com")
        assert is_valid is False

    def test_invalid_email_no_domain(self):
        """Test that emails without domain are rejected."""
        is_valid, msg = validate_email("user@")
        assert is_valid is False

    def test_empty_email(self):
        """Test that empty emails are rejected."""
        is_valid, msg = validate_email("")
        assert is_valid is False


class TestValidatePositiveInteger:
    """Tests for validate_positive_integer function."""

    def test_valid_positive_integer(self):
        """Test that positive integers are accepted."""
        is_valid, value, msg = validate_positive_integer(5)
        assert is_valid is True
        assert value == 5

    def test_string_number(self):
        """Test that string numbers are converted."""
        is_valid, value, msg = validate_positive_integer("10")
        assert is_valid is True
        assert value == 10

    def test_zero(self):
        """Test that zero is rejected with default min_value."""
        is_valid, value, msg = validate_positive_integer(0)
        assert is_valid is False

    def test_negative_number(self):
        """Test that negative numbers are rejected."""
        is_valid, value, msg = validate_positive_integer(-5)
        assert is_valid is False

    def test_non_numeric(self):
        """Test that non-numeric values are rejected."""
        is_valid, value, msg = validate_positive_integer("abc")
        assert is_valid is False

    def test_custom_min_value(self):
        """Test custom minimum value."""
        is_valid, value, msg = validate_positive_integer(5, min_value=10)
        assert is_valid is False

    def test_max_value(self):
        """Test maximum value enforcement."""
        is_valid, value, msg = validate_positive_integer(100, max_value=50)
        assert is_valid is False


class TestValidateUUID:
    """Tests for validate_uuid function."""

    def test_valid_uuid_with_hyphens(self):
        """Test UUID with hyphens."""
        is_valid, msg = validate_uuid("550e8400-e29b-41d4-a716-446655440000")
        assert is_valid is True

    def test_valid_uuid_without_hyphens(self):
        """Test UUID without hyphens."""
        is_valid, msg = validate_uuid("550e8400e29b41d4a716446655440000")
        assert is_valid is True

    def test_invalid_uuid_wrong_length(self):
        """Test UUID with wrong length."""
        is_valid, msg = validate_uuid("550e8400-e29b-41d4-a716")
        assert is_valid is False

    def test_invalid_uuid_bad_chars(self):
        """Test UUID with invalid characters."""
        is_valid, msg = validate_uuid("550e8400-e29b-41d4-a716-44665544ZZZZ")
        assert is_valid is False

    def test_empty_uuid(self):
        """Test empty UUID."""
        is_valid, msg = validate_uuid("")
        assert is_valid is False


class TestGetContentType:
    """Tests for get_content_type function."""

    def test_mpp_content_type(self):
        """Test content type for .mpp files."""
        content_type = get_content_type("project.mpp")
        assert content_type == "application/vnd.ms-project"

    def test_mpx_content_type(self):
        """Test content type for .mpx files."""
        content_type = get_content_type("project.mpx")
        assert content_type == "application/x-project"

    def test_xml_content_type(self):
        """Test content type for .xml files."""
        content_type = get_content_type("project.xml")
        assert content_type == "application/xml"

    def test_uppercase_extension(self):
        """Test content type with uppercase extension."""
        content_type = get_content_type("project.MPP")
        assert content_type == "application/vnd.ms-project"

    def test_unknown_extension(self):
        """Test content type for unknown extensions."""
        content_type = get_content_type("file.xyz")
        assert content_type == "application/octet-stream"

    def test_empty_filename(self):
        """Test content type for empty filename."""
        content_type = get_content_type("")
        assert content_type == "application/octet-stream"


class TestValidateFile:
    """Tests for validate_file function."""

    def test_valid_file(self):
        """Test that valid files pass all checks."""
        is_valid, errors = validate_file("project.mpp", 1024 * 1024)
        assert is_valid is True
        assert len(errors) == 0

    def test_invalid_extension(self):
        """Test that invalid extensions are caught."""
        is_valid, errors = validate_file("project.txt", 1024 * 1024)
        assert is_valid is False
        assert len(errors) > 0
        assert any("Invalid file type" in e for e in errors)

    def test_file_too_small(self):
        """Test that small files are caught."""
        is_valid, errors = validate_file("project.mpp", 10)
        assert is_valid is False
        assert any("small" in e.lower() for e in errors)

    def test_file_too_large(self):
        """Test that large files are caught."""
        is_valid, errors = validate_file("project.mpp", DEFAULT_MAX_FILE_SIZE + 1)
        assert is_valid is False
        assert any("large" in e.lower() for e in errors)

    def test_multiple_errors(self):
        """Test that multiple errors are reported."""
        is_valid, errors = validate_file("project.txt", 10)
        assert is_valid is False
        assert len(errors) >= 2
