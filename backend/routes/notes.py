from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Tuple

from database.connection import get_db
from middleware.auth_middleware import verify_token
from models.schemas import Note, NoteCreate, NotesResponse, ApiResponse
from services import NoteService, TagService

router = APIRouter(prefix="/notes", tags=["notes"])
note_service = NoteService()
tag_service = TagService()


@router.get("", response_model=NotesResponse)
async def list_notes(
    search: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    user_id: int = Depends(verify_token),
    db = Depends(get_db)
) -> NotesResponse:
    """
    Get all notes for authenticated user with optional search and pagination.

    Query Parameters:
    - search: Search term (optional, max 100 chars)
    - page: Page number (default 1)
    - page_size: Notes per page (default 10, max 100)

    Returns paginated notes for current user.
    """
    notes, total, total_pages = await note_service.get_notes(
        db=db,
        user_id=user_id,
        search=search,
        page=page,
        page_size=page_size
    )
    return NotesResponse(
        notes=notes,
        total=total,
        pages=total_pages,
        current_page=page
    )


@router.post("/tags", status_code=201, tags=["tags"], response_model=ApiResponse)
async def create_tag(
    body: dict,
    db = Depends(get_db)
):
    """Create a new tag"""
    tag = await tag_service.create_tag(db, body.get("name"))
    return ApiResponse(success=True, data=tag, message="Tag created successfully")


@router.get("/tags", tags=["tags"], response_model=ApiResponse)
async def list_tags(db = Depends(get_db)):
    """Get all tags"""
    tags = await tag_service.get_all_tags(db)
    return ApiResponse(success=True, data=tags)


@router.get("/{note_id}", response_model=Note)
async def get_note(
    note_id: int,
    user_id: int = Depends(verify_token),
    db = Depends(get_db)
) -> Note:
    """
    Get a single note by ID (only if owned by authenticated user).

    Returns the note if found and owned by user, 404 otherwise.
    """
    note = await note_service.get_note(db=db, note_id=note_id, user_id=user_id)
    return Note(**note)


@router.post("", response_model=Note, status_code=201)
async def create_note(
    body: NoteCreate,
    user_id: int = Depends(verify_token),
    db = Depends(get_db)
) -> Note:
    """
    Create a new note for authenticated user.

    Request body:
    - title: Note title (required, non-empty)
    - content: Note content in markdown (required, non-empty)
    - tags: Optional list of tag IDs

    Returns the created note with auto-generated ID and timestamps.
    """
    note = await note_service.create_note(
        db=db,
        user_id=user_id,
        title=body.title,
        content=body.content,
        tags=body.tags
    )
    return Note(**note)


@router.put("/{note_id}", response_model=Note)
async def update_note(
    note_id: int,
    body: NoteCreate,
    user_id: int = Depends(verify_token),
    db = Depends(get_db)
) -> Note:
    """
    Update an existing note (only if owned by authenticated user).

    URL Parameter:
    - note_id: ID of the note to update

    Request body:
    - title: New title (required, non-empty)
    - content: New content in markdown (required, non-empty)

    Returns the updated note, 404 if not found or not owned by user.
    """
    note = await note_service.update_note(
        db=db,
        note_id=note_id,
        user_id=user_id,
        title=body.title,
        content=body.content
    )
    return Note(**note)


@router.delete("/{note_id}", status_code=204)
async def delete_note(
    note_id: int,
    user_id: int = Depends(verify_token),
    db = Depends(get_db)
):
    """
    Delete a note by ID (only if owned by authenticated user).

    Returns 204 No Content if deleted, 404 if not found or not owned by user.
    """
    await note_service.delete_note(db=db, note_id=note_id, user_id=user_id)


@router.post("/{note_id}/tags/{tag_id}", status_code=201, tags=["tags"], response_model=ApiResponse)
async def add_tag_to_note(
    note_id: int,
    tag_id: int,
    user_id: int = Depends(verify_token),
    db = Depends(get_db)
):
    """Add a tag to a note (only if owned by authenticated user)"""
    success = await tag_service.add_tag_to_note(db, note_id, tag_id, user_id)
    return ApiResponse(success=success, message="Tag added to note")


@router.delete("/{note_id}/tags/{tag_id}", status_code=204, tags=["tags"])
async def remove_tag_from_note(
    note_id: int,
    tag_id: int,
    user_id: int = Depends(verify_token),
    db = Depends(get_db)
):
    """Remove a tag from a note (only if owned by authenticated user)"""
    await tag_service.remove_tag_from_note(db, note_id, tag_id, user_id)


@router.get("/{note_id}/tags", tags=["tags"], response_model=ApiResponse)
async def get_note_tags(
    note_id: int,
    user_id: int = Depends(verify_token),
    db = Depends(get_db)
):
    """Get all tags for a note (only if owned by authenticated user)"""
    tags = await tag_service.get_tags_for_note(db, note_id, user_id)
    return ApiResponse(success=True, data=tags)
