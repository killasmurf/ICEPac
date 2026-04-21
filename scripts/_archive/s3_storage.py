"""
S3 Storage Service for persisting Microsoft Project files.

Handles upload, download, list, and delete operations for project files in AWS S3.
"""

import boto3
import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)


class S3StorageError(Exception):
    """Custom exception for S3 storage operations"""
    pass


class S3Storage:
    """Service for managing project files in AWS S3"""
    
    def __init__(
        self,
        bucket_name: Optional[str] = None,
        region: Optional[str] = None,
        endpoint_url: Optional[str] = None
    ):
        """
        Initialize S3 storage service.
        
        Args:
            bucket_name: S3 bucket name (defaults to S3_BUCKET_NAME env var)
            region: AWS region (defaults to AWS_REGION env var)
            endpoint_url: Custom endpoint for local testing (e.g., LocalStack, MinIO)
        """
        self.bucket_name = bucket_name or os.getenv("S3_BUCKET_NAME", "icepac-uploads")
        self.region = region or os.getenv("AWS_REGION", "us-east-1")
        self.endpoint_url = endpoint_url or os.getenv("S3_ENDPOINT_URL")
        
        # Initialize S3 client
        client_kwargs = {"region_name": self.region}
        if self.endpoint_url:
            client_kwargs["endpoint_url"] = self.endpoint_url
        
        self.s3_client = boto3.client("s3", **client_kwargs)
    
    def _generate_key(self, filename: str, user_id: Optional[str] = None) -> str:
        """
        Generate a unique S3 key for the file.
        
        Args:
            filename: Original filename
            user_id: Optional user ID for organizing files by user
            
        Returns:
            S3 object key
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        
        # Sanitize filename
        safe_filename = "".join(c for c in filename if c.isalnum() or c in ".-_")
        
        if user_id:
            return f"projects/{user_id}/{timestamp}_{unique_id}_{safe_filename}"
        return f"projects/{timestamp}_{unique_id}_{safe_filename}"
    
    async def upload_file(
        self,
        file_contents: bytes,
        filename: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Upload a file to S3.
        
        Args:
            file_contents: File content as bytes
            filename: Original filename
            user_id: Optional user ID for file organization
            metadata: Optional metadata to attach to the file
            
        Returns:
            Dictionary with upload details (key, url, size, etc.)
            
        Raises:
            S3StorageError: If upload fails
        """
        s3_key = self._generate_key(filename, user_id)
        
        try:
            extra_args = {
                "ContentType": self._get_content_type(filename),
                "Metadata": metadata or {}
            }
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_contents,
                **extra_args
            )
            
            logger.info(f"Successfully uploaded file to s3://{self.bucket_name}/{s3_key}")
            
            return {
                "s3_key": s3_key,
                "bucket": self.bucket_name,
                "size_bytes": len(file_contents),
                "filename": filename,
                "uploaded_at": datetime.utcnow().isoformat(),
                "url": f"s3://{self.bucket_name}/{s3_key}"
            }
            
        except ClientError as e:
            error_msg = f"Failed to upload file to S3: {e.response['Error']['Message']}"
            logger.error(error_msg)
            raise S3StorageError(error_msg) from e
    
    async def download_file(self, s3_key: str) -> bytes:
        """
        Download a file from S3.
        
        Args:
            s3_key: S3 object key
            
        Returns:
            File contents as bytes
            
        Raises:
            S3StorageError: If download fails or file not found
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response["Body"].read()
            
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "NoSuchKey":
                raise S3StorageError(f"File not found: {s3_key}") from e
            error_msg = f"Failed to download file from S3: {e.response['Error']['Message']}"
            logger.error(error_msg)
            raise S3StorageError(error_msg) from e
    
    async def delete_file(self, s3_key: str) -> bool:
        """
        Delete a file from S3.
        
        Args:
            s3_key: S3 object key
            
        Returns:
            True if deletion was successful
            
        Raises:
            S3StorageError: If deletion fails
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Successfully deleted s3://{self.bucket_name}/{s3_key}")
            return True
            
        except ClientError as e:
            error_msg = f"Failed to delete file from S3: {e.response['Error']['Message']}"
            logger.error(error_msg)
            raise S3StorageError(error_msg) from e
    
    async def list_files(
        self,
        prefix: Optional[str] = "projects/",
        max_files: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List files in S3 bucket.
        
        Args:
            prefix: S3 key prefix to filter results
            max_files: Maximum number of files to return
            
        Returns:
            List of file information dictionaries
            
        Raises:
            S3StorageError: If listing fails
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_files
            )
            
            files = []
            for obj in response.get("Contents", []):
                files.append({
                    "s3_key": obj["Key"],
                    "size_bytes": obj["Size"],
                    "last_modified": obj["LastModified"].isoformat(),
                    "filename": obj["Key"].split("/")[-1]
                })
            
            return files
            
        except ClientError as e:
            error_msg = f"Failed to list files in S3: {e.response['Error']['Message']}"
            logger.error(error_msg)
            raise S3StorageError(error_msg) from e
    
    async def get_file_metadata(self, s3_key: str) -> Dict[str, Any]:
        """
        Get metadata for a file in S3.
        
        Args:
            s3_key: S3 object key
            
        Returns:
            File metadata dictionary
            
        Raises:
            S3StorageError: If operation fails or file not found
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            return {
                "s3_key": s3_key,
                "size_bytes": response["ContentLength"],
                "content_type": response.get("ContentType"),
                "last_modified": response["LastModified"].isoformat(),
                "metadata": response.get("Metadata", {})
            }
            
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "404":
                raise S3StorageError(f"File not found: {s3_key}") from e
            error_msg = f"Failed to get file metadata: {e.response['Error']['Message']}"
            logger.error(error_msg)
            raise S3StorageError(error_msg) from e
    
    async def generate_presigned_url(
        self,
        s3_key: str,
        expiration: int = 3600,
        for_upload: bool = False
    ) -> str:
        """
        Generate a presigned URL for direct S3 access.
        
        Args:
            s3_key: S3 object key
            expiration: URL expiration time in seconds (default 1 hour)
            for_upload: If True, generate URL for uploading; otherwise for downloading
            
        Returns:
            Presigned URL string
            
        Raises:
            S3StorageError: If URL generation fails
        """
        try:
            client_method = "put_object" if for_upload else "get_object"
            
            url = self.s3_client.generate_presigned_url(
                ClientMethod=client_method,
                Params={
                    "Bucket": self.bucket_name,
                    "Key": s3_key
                },
                ExpiresIn=expiration
            )
            return url
            
        except ClientError as e:
            error_msg = f"Failed to generate presigned URL: {e.response['Error']['Message']}"
            logger.error(error_msg)
            raise S3StorageError(error_msg) from e
    
    def _get_content_type(self, filename: str) -> str:
        """Determine content type based on file extension"""
        extension = filename.lower().split(".")[-1]
        content_types = {
            "mpp": "application/vnd.ms-project",
            "mpx": "application/x-project",
            "xml": "application/xml"
        }
        return content_types.get(extension, "application/octet-stream")
    
    async def ensure_bucket_exists(self) -> bool:
        """
        Ensure the S3 bucket exists, create if it doesn't.
        
        Returns:
            True if bucket exists or was created
            
        Raises:
            S3StorageError: If bucket creation fails
        """
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return True
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "404":
                try:
                    if self.region == "us-east-1":
                        self.s3_client.create_bucket(Bucket=self.bucket_name)
                    else:
                        self.s3_client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={
                                "LocationConstraint": self.region
                            }
                        )
                    logger.info(f"Created S3 bucket: {self.bucket_name}")
                    return True
                except ClientError as create_error:
                    raise S3StorageError(
                        f"Failed to create bucket: {create_error.response['Error']['Message']}"
                    ) from create_error
            raise S3StorageError(
                f"Failed to check bucket: {e.response['Error']['Message']}"
            ) from e
