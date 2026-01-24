"""
S3 Storage response models using Pydantic.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class FileUploadResult(BaseModel):
    """Response model for successful file upload"""
    s3_key: str = Field(..., description="S3 object key")
    bucket: str = Field(..., description="S3 bucket name")
    size_bytes: int = Field(..., description="File size in bytes")
    filename: str = Field(..., description="Original filename")
    uploaded_at: str = Field(..., description="Upload timestamp (ISO format)")
    url: str = Field(..., description="S3 URL (s3://bucket/key)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "s3_key": "projects/20240115_abc123_project.mpp",
                "bucket": "icepac-uploads",
                "size_bytes": 524288,
                "filename": "project.mpp",
                "uploaded_at": "2024-01-15T10:30:00",
                "url": "s3://icepac-uploads/projects/20240115_abc123_project.mpp"
            }
        }


class FileInfo(BaseModel):
    """Information about a stored file"""
    s3_key: str = Field(..., description="S3 object key")
    size_bytes: int = Field(..., description="File size in bytes")
    last_modified: str = Field(..., description="Last modification timestamp")
    filename: str = Field(..., description="Filename extracted from key")
    
    class Config:
        json_schema_extra = {
            "example": {
                "s3_key": "projects/20240115_abc123_project.mpp",
                "size_bytes": 524288,
                "last_modified": "2024-01-15T10:30:00",
                "filename": "20240115_abc123_project.mpp"
            }
        }


class FileListResponse(BaseModel):
    """Response model for listing files"""
    files: List[FileInfo] = Field(default_factory=list, description="List of files")
    total: int = Field(..., description="Total number of files returned")
    
    class Config:
        json_schema_extra = {
            "example": {
                "files": [
                    {
                        "s3_key": "projects/20240115_abc123_project.mpp",
                        "size_bytes": 524288,
                        "last_modified": "2024-01-15T10:30:00",
                        "filename": "20240115_abc123_project.mpp"
                    }
                ],
                "total": 1
            }
        }


class PresignedUrlResponse(BaseModel):
    """Response model for presigned URL generation"""
    url: str = Field(..., description="Presigned URL for direct S3 access")
    expires_in: int = Field(..., description="URL expiration time in seconds")
    s3_key: str = Field(..., description="S3 object key")
    
    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://icepac-uploads.s3.amazonaws.com/projects/...",
                "expires_in": 3600,
                "s3_key": "projects/20240115_abc123_project.mpp"
            }
        }


class ProjectUploadResponse(BaseModel):
    """Response model for project file upload with parsing"""
    status: str = Field(..., description="Upload status")
    filename: str = Field(..., description="Original filename")
    project_id: str = Field(..., description="Unique project identifier (S3 key)")
    storage: FileUploadResult = Field(..., description="S3 storage details")
    data: dict = Field(..., description="Parsed project data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "filename": "project.mpp",
                "project_id": "projects/20240115_abc123_project.mpp",
                "storage": {
                    "s3_key": "projects/20240115_abc123_project.mpp",
                    "bucket": "icepac-uploads",
                    "size_bytes": 524288,
                    "filename": "project.mpp",
                    "uploaded_at": "2024-01-15T10:30:00",
                    "url": "s3://icepac-uploads/projects/20240115_abc123_project.mpp"
                },
                "data": {
                    "project_name": "Website Redesign",
                    "start_date": "2024-01-15",
                    "finish_date": "2024-06-30",
                    "tasks": [],
                    "resources": []
                }
            }
        }
