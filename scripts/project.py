"""
Project routes for uploading and retrieving Microsoft Project files.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from app.services.mpp_reader import MPPReader
from app.services.s3_storage import S3Storage, S3StorageError
from app.models.storage import (
    ProjectUploadResponse,
    FileListResponse,
    FileInfo,
    PresignedUrlResponse
)
from app.utils.validators import validate_file_extension, validate_file_size
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
s3_storage = S3Storage()


@router.post(
    "/upload",
    response_model=ProjectUploadResponse,
    summary="Upload and parse a project file",
    description="Upload a Microsoft Project file (.mpp, .mpx, .xml), parse it, and store in S3.",
    responses={
        400: {"description": "Invalid file type or size"},
        500: {"description": "Processing or storage error"}
    }
)
async def upload_project_file(
    file: UploadFile = File(..., description="Microsoft Project file to upload"),
    user_id: Optional[str] = Query(None, description="Optional user ID for file organization")
) -> ProjectUploadResponse:
    """
    Upload and parse a Microsoft Project file.
    
    The file is validated, parsed to extract project data, and stored in S3 for later retrieval.
    """
    # Validate file extension
    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Supported formats: .mpp, .mpx, .xml"
        )
    
    # Read file contents
    contents = await file.read()
    
    # Validate file size
    if not validate_file_size(len(contents)):
        raise HTTPException(
            status_code=400,
            detail="Invalid file size. File must be between 100 bytes and 50 MB."
        )
    
    try:
        # Parse the project file
        reader = MPPReader()
        project_data = reader.parse(contents, file.filename)
        
        # Store in S3
        storage_result = await s3_storage.upload_file(
            file_contents=contents,
            filename=file.filename,
            user_id=user_id,
            metadata={
                "original_filename": file.filename,
                "project_name": project_data.get("project_name", "Unknown")
            }
        )
        
        logger.info(f"Successfully processed and stored: {file.filename}")
        
        return ProjectUploadResponse(
            status="success",
            filename=file.filename,
            project_id=storage_result["s3_key"],
            storage=storage_result,
            data=project_data
        )
        
    except S3StorageError as e:
        logger.error(f"S3 storage error: {e}")
        raise HTTPException(status_code=500, detail=f"Storage error: {str(e)}")
    except Exception as e:
        logger.error(f"Processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@router.get(
    "/projects/{project_id:path}",
    summary="Retrieve project by ID",
    description="Download and re-parse a previously uploaded project file from S3.",
    responses={
        404: {"description": "Project not found"},
        500: {"description": "Retrieval or parsing error"}
    }
)
async def get_project(project_id: str) -> Dict[str, Any]:
    """
    Retrieve project data by its S3 key (project_id).
    
    Downloads the file from S3 and re-parses it to return the project data.
    """
    try:
        # Download from S3
        file_contents = await s3_storage.download_file(project_id)
        
        # Get file metadata
        metadata = await s3_storage.get_file_metadata(project_id)
        filename = metadata.get("metadata", {}).get("original_filename", project_id.split("/")[-1])
        
        # Parse the file
        reader = MPPReader()
        project_data = reader.parse(file_contents, filename)
        
        return {
            "project_id": project_id,
            "filename": filename,
            "data": project_data,
            "storage": metadata
        }
        
    except S3StorageError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/projects",
    response_model=FileListResponse,
    summary="List all projects",
    description="Retrieve a list of all uploaded project files from S3."
)
async def list_projects(
    prefix: Optional[str] = Query("projects/", description="S3 key prefix filter"),
    max_files: int = Query(100, ge=1, le=1000, description="Maximum files to return")
) -> FileListResponse:
    """
    List all uploaded projects from S3.
    """
    try:
        files = await s3_storage.list_files(prefix=prefix, max_files=max_files)
        
        return FileListResponse(
            files=[FileInfo(**f) for f in files],
            total=len(files)
        )
        
    except S3StorageError as e:
        logger.error(f"Error listing projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/projects/{project_id:path}",
    summary="Delete a project",
    description="Delete a project file from S3 storage."
)
async def delete_project(project_id: str) -> Dict[str, Any]:
    """
    Delete a project file from S3.
    """
    try:
        await s3_storage.delete_file(project_id)
        return {
            "status": "success",
            "message": f"Project deleted: {project_id}"
        }
    except S3StorageError as e:
        logger.error(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/projects/{project_id:path}/download-url",
    response_model=PresignedUrlResponse,
    summary="Get download URL",
    description="Generate a presigned URL for direct file download."
)
async def get_download_url(
    project_id: str,
    expires_in: int = Query(3600, ge=60, le=86400, description="URL expiration in seconds")
) -> PresignedUrlResponse:
    """
    Generate a presigned URL for downloading the project file directly from S3.
    """
    try:
        url = await s3_storage.generate_presigned_url(
            s3_key=project_id,
            expiration=expires_in
        )
        
        return PresignedUrlResponse(
            url=url,
            expires_in=expires_in,
            s3_key=project_id
        )
        
    except S3StorageError as e:
        logger.error(f"Error generating download URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))
