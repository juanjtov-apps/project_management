#!/usr/bin/env python3
"""
Minimal working backend for testing
"""
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Set working directory
os.chdir('/home/runner/workspace')

# Create minimal app
app = FastAPI(title="Tower Flow Simple Backend")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Simple backend running"}

@app.get("/api/projects")
async def get_projects():
    return [{"id": "test", "name": "Test Project", "status": "active"}]

@app.post("/api/projects")
async def create_project(project: dict):
    return {"id": "new-project", "message": "Project created", "data": project}

if __name__ == "__main__":
    print("Starting simple backend on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")