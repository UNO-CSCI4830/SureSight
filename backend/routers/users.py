#userinteractions
# backend/routers/users.py

from fastapi import APIRouter, HTTPException
from models.users import UserCreate, UserResponse
from services.users import register_user, get_user

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    new_user = register_user(user)
    if not new_user:
        raise HTTPException(status_code=400, detail="User already exists")
    return new_user

@router.get("/{user_id}", response_model=UserResponse)
async def fetch_user(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user