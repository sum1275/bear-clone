from pydantic import BaseModel, Field, validator
from typing import List, Optional, Any

class ApiResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None

class Note(BaseModel):
    """Note from database"""
    id: int
    title: str
    content: str
    user_id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True  # Works with SQLAlchemy models

class NoteCreate(BaseModel):
    """Data when creating/updating note"""
    title: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Note title (required, 1-500 chars)"
    )
    content: str = Field(
        default="",
        description="Note content (optional)"
    )
    tags: List[int] = Field(
    default=[],
    description="Tag IDs to add to note"
)


    @validator('title')
    def title_not_empty(cls, v):
        """Validate title isn't just whitespace"""
        if not v.strip():
            raise ValueError('Title cannot be empty or whitespace only')
        return v.strip()

class NotesResponse(BaseModel):
    """Paginated notes response"""
    notes: List[Note]
    total: int
    pages: int
    current_page: int
class User(BaseModel):
    id: int
    username: str
    email: str
    created_at: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserWithToken(BaseModel):
    id: int
    username: str
    email: str
    created_at: str
    token: str
