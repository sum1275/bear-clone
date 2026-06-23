from fastapi import APIRouter
from .notes import router as notes_router
from .auth import router as auth_router

router = APIRouter()
router.include_router(notes_router)
router.include_router(auth_router)

__all__ = ["router"]
