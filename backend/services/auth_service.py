import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from config import settings

def hash_password(password: str) -> str:
    """Hash password with bcrypt (max 72 bytes due to bcrypt limitation)"""
    pwd_bytes = password.encode('utf-8')[:72]
    hashed = bcrypt.hashpw(pwd_bytes, bcrypt.gensalt(rounds=12))
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash (max 72 bytes due to bcrypt limitation)"""
    pwd_bytes = password.encode('utf-8')[:72]
    return bcrypt.checkpw(pwd_bytes, hashed.encode('utf-8'))

def create_token(user_id: int) -> str:
    """Create JWT token with expiration"""
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
    payload = {"user_id": user_id, "exp": expires}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> int:
    """Decode JWT and return user_id, raise error if invalid"""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload.get("user_id")
    except JWTError:
        return None
