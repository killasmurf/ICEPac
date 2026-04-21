"""
Unit tests for S3 storage service.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError
from app.services.s3_storage import S3Storage, S3StorageError


class TestS3Storage:
    """Tests for S3Storage class"""
    
    @pytest.fixture
    def mock_s3_client(self):
        """Create a mock S3 client"""
        with patch("boto3.client") as mock_client:
            yield mock_client.return_value
    
    @pytest.fixture
    def s3_storage(self, mock_s3_client):
        """Create S3Storage instance with mocked client"""
        with patch("boto3.client") as mock_client:
            mock_client.return_value = mock_s3_client
            storage = S3Storage(
                bucket_name="test-bucket",
                region="us-east-1"
            )
            storage.s3_client = mock_s3_client
            return storage
    
    # Upload Tests
    
    @pytest.mark.asyncio
    async def test_upload_file_success(self, s3_storage, mock_s3_client):
        """Test successful file upload"""
        mock_s3_client.put_object.return_value = {}
        
        result = await s3_storage.upload_file(
            file_contents=b"test content",
            filename="test.mpp"
        )
        
        assert result["bucket"] == "test-bucket"
        assert result["filename"] == "test.mpp"
        assert result["size_bytes"] == 12
        assert "s3_key" in result
        assert result["s3_key"].startswith("projects/")
        mock_s3_client.put_object.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_upload_file_with_user_id(self, s3_storage, mock_s3_client):
        """Test file upload with user ID creates proper path"""
        mock_s3_client.put_object.return_value = {}
        
        result = await s3_storage.upload_file(
            file_contents=b"test content",
            filename="test.mpp",
            user_id="user123"
        )
        
        assert "user123" in result["s3_key"]
    
    @pytest.mark.asyncio
    async def test_upload_file_with_metadata(self, s3_storage, mock_s3_client):
        """Test file upload with custom metadata"""
        mock_s3_client.put_object.return_value = {}
        
        await s3_storage.upload_file(
            file_contents=b"test content",
            filename="test.mpp",
            metadata={"project_name": "Test Project"}
        )
        
        call_args = mock_s3_client.put_object.call_args
        assert call_args.kwargs["Metadata"] == {"project_name": "Test Project"}
    
    @pytest.mark.asyncio
    async def test_upload_file_failure(self, s3_storage, mock_s3_client):
        """Test upload failure raises S3StorageError"""
        mock_s3_client.put_object.side_effect = ClientError(
            {"Error": {"Code": "500", "Message": "Internal Error"}},
            "PutObject"
        )
        
        with pytest.raises(S3StorageError, match="Failed to upload"):
            await s3_storage.upload_file(
                file_contents=b"test content",
                filename="test.mpp"
            )
    
    # Download Tests
    
    @pytest.mark.asyncio
    async def test_download_file_success(self, s3_storage, mock_s3_client):
        """Test successful file download"""
        mock_body = Mock()
        mock_body.read.return_value = b"file content"
        mock_s3_client.get_object.return_value = {"Body": mock_body}
        
        result = await s3_storage.download_file("projects/test.mpp")
        
        assert result == b"file content"
        mock_s3_client.get_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="projects/test.mpp"
        )
    
    @pytest.mark.asyncio
    async def test_download_file_not_found(self, s3_storage, mock_s3_client):
        """Test download of non-existent file"""
        mock_s3_client.get_object.side_effect = ClientError(
            {"Error": {"Code": "NoSuchKey", "Message": "Not found"}},
            "GetObject"
        )
        
        with pytest.raises(S3StorageError, match="File not found"):
            await s3_storage.download_file("projects/nonexistent.mpp")
    
    # Delete Tests
    
    @pytest.mark.asyncio
    async def test_delete_file_success(self, s3_storage, mock_s3_client):
        """Test successful file deletion"""
        mock_s3_client.delete_object.return_value = {}
        
        result = await s3_storage.delete_file("projects/test.mpp")
        
        assert result is True
        mock_s3_client.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="projects/test.mpp"
        )
    
    @pytest.mark.asyncio
    async def test_delete_file_failure(self, s3_storage, mock_s3_client):
        """Test delete failure raises S3StorageError"""
        mock_s3_client.delete_object.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}},
            "DeleteObject"
        )
        
        with pytest.raises(S3StorageError, match="Failed to delete"):
            await s3_storage.delete_file("projects/test.mpp")
    
    # List Tests
    
    @pytest.mark.asyncio
    async def test_list_files_success(self, s3_storage, mock_s3_client):
        """Test successful file listing"""
        from datetime import datetime
        
        mock_s3_client.list_objects_v2.return_value = {
            "Contents": [
                {
                    "Key": "projects/file1.mpp",
                    "Size": 1024,
                    "LastModified": datetime(2024, 1, 15, 10, 30)
                },
                {
                    "Key": "projects/file2.mpp",
                    "Size": 2048,
                    "LastModified": datetime(2024, 1, 16, 11, 45)
                }
            ]
        }
        
        result = await s3_storage.list_files()
        
        assert len(result) == 2
        assert result[0]["s3_key"] == "projects/file1.mpp"
        assert result[0]["size_bytes"] == 1024
        assert result[1]["s3_key"] == "projects/file2.mpp"
    
    @pytest.mark.asyncio
    async def test_list_files_empty(self, s3_storage, mock_s3_client):
        """Test listing when bucket is empty"""
        mock_s3_client.list_objects_v2.return_value = {}
        
        result = await s3_storage.list_files()
        
        assert result == []
    
    @pytest.mark.asyncio
    async def test_list_files_with_prefix(self, s3_storage, mock_s3_client):
        """Test listing with custom prefix"""
        mock_s3_client.list_objects_v2.return_value = {"Contents": []}
        
        await s3_storage.list_files(prefix="projects/user123/")
        
        call_args = mock_s3_client.list_objects_v2.call_args
        assert call_args.kwargs["Prefix"] == "projects/user123/"
    
    # Metadata Tests
    
    @pytest.mark.asyncio
    async def test_get_file_metadata_success(self, s3_storage, mock_s3_client):
        """Test getting file metadata"""
        from datetime import datetime
        
        mock_s3_client.head_object.return_value = {
            "ContentLength": 5120,
            "ContentType": "application/vnd.ms-project",
            "LastModified": datetime(2024, 1, 15, 10, 30),
            "Metadata": {"project_name": "Test Project"}
        }
        
        result = await s3_storage.get_file_metadata("projects/test.mpp")
        
        assert result["s3_key"] == "projects/test.mpp"
        assert result["size_bytes"] == 5120
        assert result["content_type"] == "application/vnd.ms-project"
        assert result["metadata"]["project_name"] == "Test Project"
    
    @pytest.mark.asyncio
    async def test_get_file_metadata_not_found(self, s3_storage, mock_s3_client):
        """Test metadata for non-existent file"""
        mock_s3_client.head_object.side_effect = ClientError(
            {"Error": {"Code": "404", "Message": "Not Found"}},
            "HeadObject"
        )
        
        with pytest.raises(S3StorageError, match="File not found"):
            await s3_storage.get_file_metadata("projects/nonexistent.mpp")
    
    # Presigned URL Tests
    
    @pytest.mark.asyncio
    async def test_generate_presigned_url_download(self, s3_storage, mock_s3_client):
        """Test generating presigned URL for download"""
        mock_s3_client.generate_presigned_url.return_value = "https://signed-url.com"
        
        result = await s3_storage.generate_presigned_url("projects/test.mpp")
        
        assert result == "https://signed-url.com"
        mock_s3_client.generate_presigned_url.assert_called_once_with(
            ClientMethod="get_object",
            Params={"Bucket": "test-bucket", "Key": "projects/test.mpp"},
            ExpiresIn=3600
        )
    
    @pytest.mark.asyncio
    async def test_generate_presigned_url_upload(self, s3_storage, mock_s3_client):
        """Test generating presigned URL for upload"""
        mock_s3_client.generate_presigned_url.return_value = "https://signed-url.com"
        
        await s3_storage.generate_presigned_url(
            "projects/test.mpp",
            for_upload=True
        )
        
        call_args = mock_s3_client.generate_presigned_url.call_args
        assert call_args.kwargs["ClientMethod"] == "put_object"
    
    # Bucket Management Tests
    
    @pytest.mark.asyncio
    async def test_ensure_bucket_exists_already_exists(self, s3_storage, mock_s3_client):
        """Test bucket check when bucket exists"""
        mock_s3_client.head_bucket.return_value = {}
        
        result = await s3_storage.ensure_bucket_exists()
        
        assert result is True
        mock_s3_client.create_bucket.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_ensure_bucket_exists_creates_bucket(self, s3_storage, mock_s3_client):
        """Test bucket creation when it doesn't exist"""
        mock_s3_client.head_bucket.side_effect = ClientError(
            {"Error": {"Code": "404", "Message": "Not Found"}},
            "HeadBucket"
        )
        mock_s3_client.create_bucket.return_value = {}
        
        result = await s3_storage.ensure_bucket_exists()
        
        assert result is True
        mock_s3_client.create_bucket.assert_called_once()
    
    # Content Type Tests
    
    def test_get_content_type_mpp(self, s3_storage):
        """Test content type for .mpp files"""
        assert s3_storage._get_content_type("test.mpp") == "application/vnd.ms-project"
    
    def test_get_content_type_mpx(self, s3_storage):
        """Test content type for .mpx files"""
        assert s3_storage._get_content_type("test.mpx") == "application/x-project"
    
    def test_get_content_type_xml(self, s3_storage):
        """Test content type for .xml files"""
        assert s3_storage._get_content_type("test.xml") == "application/xml"
    
    def test_get_content_type_unknown(self, s3_storage):
        """Test content type for unknown extension"""
        assert s3_storage._get_content_type("test.unknown") == "application/octet-stream"
    
    # Key Generation Tests
    
    def test_generate_key_basic(self, s3_storage):
        """Test basic key generation"""
        key = s3_storage._generate_key("test.mpp")
        
        assert key.startswith("projects/")
        assert "test.mpp" in key
    
    def test_generate_key_with_user_id(self, s3_storage):
        """Test key generation with user ID"""
        key = s3_storage._generate_key("test.mpp", user_id="user123")
        
        assert key.startswith("projects/user123/")
        assert "test.mpp" in key
    
    def test_generate_key_sanitizes_filename(self, s3_storage):
        """Test that key generation sanitizes dangerous characters"""
        key = s3_storage._generate_key("../../../etc/passwd")
        
        assert ".." not in key
        assert "/" not in key.split("/")[-1].replace("_", "")  # Check filename part
