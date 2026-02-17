"""
Tests for the S3 storage service.
"""
from unittest.mock import MagicMock, patch

import pytest
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
        with patch("app.services.s3_service.boto3") as mock_boto3:
            mock_boto3.client.return_value = mock_s3_client
            service = S3Service()
            service.s3_client = mock_s3_client
            return service

    @pytest.mark.asyncio
    async def test_upload_file_success(self, s3_service, mock_s3_client):
        """Test successful file upload."""
        mock_s3_client.put_object.return_value = {"ETag": '"test-etag"'}

        result = await s3_service.upload_file(
            file_content=b"test content",
            s3_key="projects/test/test.mpp",
            content_type="application/vnd.ms-project",
        )

        mock_s3_client.put_object.assert_called_once()
        assert result is True

    @pytest.mark.asyncio
    async def test_upload_file_generates_key(self, s3_service, mock_s3_client):
        """Test that upload uses the provided key."""
        mock_s3_client.put_object.return_value = {"ETag": '"test-etag"'}

        await s3_service.upload_file(
            file_content=b"test content",
            s3_key="projects/test/test.mpp",
        )

        call_args = mock_s3_client.put_object.call_args
        assert call_args.kwargs["Key"] == "projects/test/test.mpp"

    @pytest.mark.asyncio
    async def test_download_file_success(self, s3_service, mock_s3_client):
        """Test successful file download."""
        mock_body = MagicMock()
        mock_body.read.return_value = b"test content"
        mock_s3_client.get_object.return_value = {"Body": mock_body}

        result = await s3_service.download_file("test-key")

        mock_s3_client.get_object.assert_called_once()
        assert result == b"test content"

    @pytest.mark.asyncio
    async def test_download_file_not_found(self, s3_service, mock_s3_client):
        """Test download when file not found."""
        mock_s3_client.get_object.side_effect = ClientError(
            {"Error": {"Code": "NoSuchKey", "Message": "Not found"}},
            "GetObject",
        )

        result = await s3_service.download_file("nonexistent-key")

        assert result is None

    @pytest.mark.asyncio
    async def test_delete_file_success(self, s3_service, mock_s3_client):
        """Test successful file deletion."""
        mock_s3_client.delete_object.return_value = {}

        result = await s3_service.delete_file("test-key")

        mock_s3_client.delete_object.assert_called_once()
        assert result is True

    def test_generate_s3_key(self, s3_service):
        """Test S3 key generation."""
        from uuid import UUID

        project_id = UUID("12345678-1234-5678-1234-567812345678")
        key = s3_service.generate_s3_key(project_id, "test.mpp")

        assert key.startswith(f"projects/{project_id}/")
        assert key.endswith("_test.mpp")

    @pytest.mark.asyncio
    async def test_generate_presigned_url(self, s3_service, mock_s3_client):
        """Test generating presigned URL."""
        mock_s3_client.generate_presigned_url.return_value = (
            "https://s3.example.com/presigned"
        )

        result = await s3_service.generate_presigned_url("test-key")

        mock_s3_client.generate_presigned_url.assert_called_once()
        assert "presigned" in result

    def test_check_bucket_exists_true(self, s3_service, mock_s3_client):
        """Test bucket exists check when bucket exists."""
        mock_s3_client.head_bucket.return_value = {}

        result = s3_service.check_bucket_exists()

        assert result is True

    def test_check_bucket_exists_false(self, s3_service, mock_s3_client):
        """Test bucket exists check when bucket doesn't exist."""
        mock_s3_client.head_bucket.side_effect = ClientError(
            {"Error": {"Code": "404", "Message": "Not found"}},
            "HeadBucket",
        )

        result = s3_service.check_bucket_exists()

        assert result is False
