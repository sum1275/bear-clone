from datetime import datetime
from typing import Dict
from repositories.note_repository import UserRepository
from services.auth_service import hash_password, verify_password
from utils.logger import logger
from utils.exceptions import BearException

class UserService:
    """Business logic for user registration and authentication"""

    @staticmethod
    async def register(db, username: str, email: str, password: str) -> Dict:
        """Register new user with password hashing"""
        # Validate inputs
        if not username or not username.strip():
            raise BearException("Username cannot be empty")
        if not email or not email.strip():
            raise BearException("Email cannot be empty")
        if not password or len(password) < 6:
            raise BearException("Password must be at least 6 characters")

        username = username.strip()
        email = email.strip()

        logger.info(f"Registering user: {username}")

        # Check if username already exists
        existing_user = await UserRepository.get_user_by_username(db, username)
        if existing_user:
            raise BearException("Username already taken")

        # Check if email already exists
        existing_email = await UserRepository.get_user_by_email(db, email)
        if existing_email:
            raise BearException("Email already registered")

        # Hash password
        hashed_password = hash_password(password)
        created_at = datetime.now().isoformat()

        # Create user
        user = await UserRepository.create_user(db, username, email, hashed_password, created_at)
        logger.info(f"User registered: {username}")

        # Return user without password
        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "created_at": user["created_at"]
        }

    @staticmethod
    async def login(db, username: str, password: str) -> Dict:
        """Login user and verify password"""
        if not username or not password:
            raise BearException("Username and password required")

        logger.info(f"Login attempt: {username}")

        # Get user by username
        user = await UserRepository.get_user_by_username(db, username)
        if not user:
            raise BearException("Invalid username or password")

        # Verify password
        if not verify_password(password, user["hashed_password"]):
            raise BearException("Invalid username or password")

        logger.info(f"User logged in: {username}")

        # Return user without password
        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "created_at": user["created_at"]
        }
