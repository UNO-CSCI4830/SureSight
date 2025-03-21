# main interface for backend 
# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from routers import assessment, users, reports

# Initialize app
app = FastAPI(
    title="SureSight API",
    description="Backend API for SureSight damage assessment and reporting system.",
    version="1.0.0"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with prefixes
app.include_router(assessment.router, prefix="/api/assessment", tags=["Assessment"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

# Optional root path
@app.get("/")
def read_root():
    return {"message": "SureSight backend is up and running."}
