"""
Auth router — POST /auth/login.

Returns a JWT token on valid credentials.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from l88_backend.services.auth_service import authenticate_user, create_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    role: str
    display_name: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    """Authenticate and return a JWT."""
    user = authenticate_user(body.username, body.password)
    token = create_token(user.id, user.username)
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        role=user.role,
        display_name=user.display_name,
    )
