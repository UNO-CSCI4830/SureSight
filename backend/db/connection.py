#backend/db/connection.py

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Retrieve the database URL from environment variables or use a default.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/suresight")

# Create the SQLAlchemy engine.
# The 'echo=True' parameter is useful for debugging SQL statements. Remove it in production.
engine = create_engine(DATABASE_URL, echo=True)

# Create a configured "Session" class.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Dependency function for FastAPI routes.
    This function creates a new database session for a request, yields it,
    and ensures the session is closed after the request is complete.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
