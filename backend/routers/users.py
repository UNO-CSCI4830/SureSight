#userinteractions
# backend/routers/users.py

from fastapi import APIRouter, Depends, HTTPException
from utils.auth import verify_firebase_token
from models.users import UserCreate, UserResponse
from services.users import register_user, get_user

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    # Registration may be left unprotected for open registration.
    new_user = register_user(user)
    if not new_user:
        raise HTTPException(status_code=400, detail="User already exists")
    return new_user

@router.get("/{user_id}", response_model=UserResponse)
async def fetch_user(user_id: str, token_data: dict = Depends(verify_firebase_token)):
    # Optionally, you can check that token_data contains the expected user ID
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
