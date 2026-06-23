from fastapi import Request
from fastapi.responses import JSONResponse
from utils import BearException, NoteNotFound, InvalidNote, DatabaseError
from utils.logger import logger


async def exception_handler(request: Request, exc: Exception):
    """
    Centralized exception handler for custom BearException and subclasses.
    Converts domain exceptions to HTTP responses.
    """
    if isinstance(exc, BearException):
        logger.warning(f"{exc.__class__.__name__}: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )

    # Unexpected errors
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
