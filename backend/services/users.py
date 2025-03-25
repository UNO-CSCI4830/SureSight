# backend/services/users.py

from models.users import UserCreate, UserResponse
from datetime import datetime
from uuid import uuid4

# Simulated in-memory user store NEED CONNECTON TO DB
_users_db = {}

def register_user(user: UserCreate) -> UserResponse | None:
    for existing in _users_db.values():
        if existing.email == user.email:
            return None  # Conflict

    user_id = str(uuid4())
    user_data = UserResponse(
        user_id=user_id,
        username=user.username,
        email=user.email,
        registered_at=datetime.utcnow()
    )
    _users_db[user_id] = user_data 
    return user_data

def get_user(user_id: str) -> UserResponse | None:
    return _users_db.get(user_id)