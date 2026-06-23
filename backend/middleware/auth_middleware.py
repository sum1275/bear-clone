from fastapi import Request, HTTPException
from services.auth_service import decode_token

async def verify_token(request: Request) -> int:
    """Verify JWT token from Authorization header and return user_id"""
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user_id
