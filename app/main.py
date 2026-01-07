from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import project
import os

app = FastAPI(
    title="icepac",
    description="Microsoft Project File Reader API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(project.router, prefix="/api/v1", tags=["project"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}