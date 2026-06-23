from fastapi import APIRouter, Depends
from database.connection import get_db
from models.schemas import UserCreate, UserLogin, ApiResponse
from services.user_service import UserService
from services.auth_service import create_token

router = APIRouter(prefix="/auth", tags=["auth"])
user_service = UserService()

@router.post("/register", response_model=ApiResponse, status_code=201)
async def register(body: UserCreate, db = Depends(get_db)):
    """Register new user and return token"""
    from utils.logger import logger
    logger.info(f"Register endpoint called with username: {body.username}")
    try:
        logger.info(f"Calling user_service.register")
        user = await user_service.register(db, body.username, body.email, body.password)
        logger.info(f"User registered: {user['id']}")
        token = create_token(user["id"])
        logger.info(f"Token created")
        return ApiResponse(
            success=True,
            data={**user, "token": token},
            message="User registered successfully"
        )
    except Exception as e:
        logger.error(f"Register error: {type(e).__name__}: {str(e)}", exc_info=True)
        raise

@router.post("/login", response_model=ApiResponse)
async def login(body: UserLogin, db = Depends(get_db)):
    """Login user and return token"""
    user = await user_service.login(db, body.username, body.password)
    token = create_token(user["id"])
    return ApiResponse(
        success=True,
        data={**user, "token": token},
        message="Login successful"
    )
