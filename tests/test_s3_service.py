"""
Tests for the S3 storage service.
"""
import pytest
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError

from app.services.s3_service import S3Service


class TestS3Service:
    """Tests for S3Service class."""

    @pytest.fixture
    def mock_s3_client(self):
        """Create a mock S3 client."""
        return MagicMock()

    @pytest.fixture
    def s3_service(self, mock_s3_client):
        """Create an S3Service instance with mocked client."""
        with patch('app.services.s3_service.boto3') as mock_boto3:
            mock_boto3.client.return_value = mock_s3_client
            service = S3Service()
            service.client = mock_s3_client
            return service

    def test_upload_file_success(self, s3_service, mock_s3_client):
        """Test successful file upload."""
        mock_s3_client.put_object.return_value = {"ETag": '"test-etag"'}

        result = s3_service.upload_file(
            file_content=b"test content",
            filename="test.mpp",
            content_type="application/vnd.ms-project"
        )

        mock_s3_client.put_object.assert_called_once()
        assert result is not None

    def test_upload_file_generates_key(self, s3_service, mock_s3_client):
        """Test that upload generates a unique key."""
        mock_s3_client.put_object.return_value = {"ETag": '"test-etag"'}

        result = s3_service.upload_file(
            file_content=b"test content",
            filename="test.mpp"
        )

        call_args = mock_s3_client.put_object.call_args
        assert "Key" in call_args.kwargs or len(call_args.args) > 0

    def test_download_file_success(self, s3_service, mock_s3_client):
        """Test successful file download."""
        mock_body = MagicMock()
        mock_body.read.return_value = b"test content"
        mock_s3_client.get_object.return_value = {"Body": mock_body}

        result = s3_service.download_file("test-key")

        mock_s3_client.get_object.assert_called_once()
        assert result == b"test content"

    def test_download_file_not_found(self, s3_service, mock_s3_client):
        """Test download when file not found."""
        mock_s3_client.get_object.side_effect = ClientError(
            {"Error": {"Code": "NoSuchKey", "Message": "Not found"}},
            "GetObject"
        )

        result = s3_service.download_file("nonexistent-key")

        assert result is None

    def test_delete_file_success(self, s3_service, mock_s3_client):
        """Test successful file deletion."""
        mock_s3_client.delete_object.return_value = {}

        result = s3_service.delete_file("test-key")

        mock_s3_client.delete_object.assert_called_once()
        assert result is True

    def test_list_files(self, s3_service, mock_s3_client):
        """Test listing files."""
        mock_s3_client.list_objects_v2.return_value = {
            "Contents": [
                {"Key": "file1.mpp", "Size": 1000},
                {"Key": "file2.mpp", "Size": 2000}
            ]
        }

        result = s3_service.list_files()

        mock_s3_client.list_objects_v2.assert_called_once()
        assert len(result) == 2

    def test_list_files_empty(self, s3_service, mock_s3_client):
        """Test listing files when bucket is empty."""
        mock_s3_client.list_objects_v2.return_value = {}

        result = s3_service.list_files()

        assert result == []

    def test_get_presigned_url(self, s3_service, mock_s3_client):
        """Test generating presigned URL."""
        mock_s3_client.generate_presigned_url.return_value = "https://s3.example.com/presigned"

        result = s3_service.get_presigned_url("test-key")

        mock_s3_client.generate_presigned_url.assert_called_once()
        assert "presigned" in result

    def test_file_exists_true(self, s3_service, mock_s3_client):
        """Test file exists check when file exists."""
        mock_s3_client.head_object.return_value = {"ContentLength": 1000}

        result = s3_service.file_exists("test-key")

        assert result is True

    def test_file_exists_false(self, s3_service, mock_s3_client):
        """Test file exists check when file doesn't exist."""
        mock_s3_client.head_object.side_effect = ClientError(
            {"Error": {"Code": "404", "Message": "Not found"}},
            "HeadObject"
        )

        result = s3_service.file_exists("nonexistent-key")

        assert result is False
