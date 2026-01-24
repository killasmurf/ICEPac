from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.mpp_reader import MPPReader
from typing import Dict, Any

router = APIRouter()

@router.post("/upload")
async def upload_project_file(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Upload and parse a Microsoft Project file"""
    
    if not file.filename.endswith((".mpp", ".mpx", ".xml")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Supported: .mpp, .mpx, .xml"
        )
    
    try:
        contents = await file.read()
        reader = MPPReader()
        project_data = reader.parse(contents, file.filename)
        return {
            "status": "success",
            "filename": file.filename,
            "data": project_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Retrieve project data by ID"""
    # TODO: Implement project retrieval from database/S3
    return {"project_id": project_id}