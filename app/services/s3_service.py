import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from typing import Optional, BinaryIO
from uuid import UUID
import logging
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)


class S3Service:
    """Service for managing file uploads and downloads to/from AWS S3"""

    def __init__(self):
        self.bucket_name = settings.s3_bucket_name
        self.region = settings.aws_region

        # Initialize S3 client
        session_kwargs = {"region_name": self.region}

        if settings.aws_access_key_id and settings.aws_secret_access_key:
            session_kwargs.update({
                "aws_access_key_id": settings.aws_access_key_id,
                "aws_secret_access_key": settings.aws_secret_access_key
            })

        self.s3_client = boto3.client("s3", **session_kwargs)

    def generate_s3_key(self, project_id: UUID, file_name: str) -> str:
        """
        Generate a unique S3 key for a project file

        Format: projects/{project_id}/{timestamp}_{filename}
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"projects/{project_id}/{timestamp}_{file_name}"

    async def upload_file(
        self,
        file_content: bytes,
        s3_key: str,
        content_type: str = "application/octet-stream"
    ) -> bool:
        """
        Upload a file to S3

        Args:
            file_content: File content as bytes
            s3_key: S3 key (path) for the file
            content_type: MIME type of the file

        Returns:
            True if upload successful, False otherwise
        """
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                ServerSideEncryption="AES256"
            )
            logger.info(f"Successfully uploaded file to S3: {s3_key}")
            return True

        except NoCredentialsError:
            logger.error("AWS credentials not found")
            return False

        except ClientError as e:
            logger.error(f"Failed to upload file to S3: {e}")
            return False

        except Exception as e:
            logger.error(f"Unexpected error uploading to S3: {e}")
            return False

    async def download_file(self, s3_key: str) -> Optional[bytes]:
        """
        Download a file from S3

        Args:
            s3_key: S3 key (path) of the file

        Returns:
            File content as bytes if successful, None otherwise
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            content = response["Body"].read()
            logger.info(f"Successfully downloaded file from S3: {s3_key}")
            return content

        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                logger.warning(f"File not found in S3: {s3_key}")
            else:
                logger.error(f"Failed to download file from S3: {e}")
            return None

        except Exception as e:
            logger.error(f"Unexpected error downloading from S3: {e}")
            return None

    async def delete_file(self, s3_key: str) -> bool:
        """
        Delete a file from S3

        Args:
            s3_key: S3 key (path) of the file

        Returns:
            True if deletion successful, False otherwise
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Successfully deleted file from S3: {s3_key}")
            return True

        except ClientError as e:
            logger.error(f"Failed to delete file from S3: {e}")
            return False

        except Exception as e:
            logger.error(f"Unexpected error deleting from S3: {e}")
            return False

    async def generate_presigned_url(
        self,
        s3_key: str,
        expiration: int = 3600
    ) -> Optional[str]:
        """
        Generate a presigned URL for temporary file access

        Args:
            s3_key: S3 key (path) of the file
            expiration: URL expiration time in seconds (default: 1 hour)

        Returns:
            Presigned URL if successful, None otherwise
        """
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": s3_key
                },
                ExpiresIn=expiration
            )
            logger.info(f"Generated presigned URL for: {s3_key}")
            return url

        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None

        except Exception as e:
            logger.error(f"Unexpected error generating presigned URL: {e}")
            return None

    def check_bucket_exists(self) -> bool:
        """
        Check if the configured S3 bucket exists

        Returns:
            True if bucket exists, False otherwise
        """
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return True
        except ClientError:
            return False


# Global S3 service instance
s3_service = S3Service()
