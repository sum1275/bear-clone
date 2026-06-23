from datetime import datetime
from typing import List, Tuple

import aiosqlite

from repositories import NoteRepository
from utils import logger, InvalidNote, NoteNotFound


class NoteService:
    """
    Business logic layer for notes.

    Responsibilities:
    - Validate input data
    - Apply business rules
    - Call repository methods
    - Log important events
    - Handle errors gracefully

    Does NOT handle:
    - HTTP concerns (that's routes)
    - Database queries (that's repository)
    """

    async def get_notes(
        self,
        db: aiosqlite.Connection,
        user_id: int,
        search: str = "",
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[dict], int, int]:
        """
        Get paginated notes for authenticated user with optional search.

        Business Rules:
        - Only return notes owned by user
        - Page must be >= 1
        - Search term max 100 chars
        - Page size between 1-100

        Args:
            db: Database connection
            user_id: Authenticated user ID
            search: Search term (optional)
            page: Page number (1-indexed)
            page_size: Notes per page

        Returns:
            (notes_list, total_count, total_pages)

        Raises:
            InvalidNote: If validation fails
        """
        # Validation: User ID
        if not isinstance(user_id, int) or user_id < 1:
            logger.warning(f"Invalid user_id: {user_id}")
            raise InvalidNote("Invalid user ID")

        # Validation: Page number
        if not isinstance(page, int) or page < 1:
            logger.warning(f"Invalid page requested: {page}")
            raise InvalidNote("Page must be a positive integer")

        # Validation: Page size
        if not isinstance(page_size, int) or page_size < 1 or page_size > 100:
            logger.warning(f"Invalid page_size requested: {page_size}")
            raise InvalidNote("Page size must be between 1-100")

        # Sanitize search term
        search = search.strip() if search else ""
        if len(search) > 100:
            search = search[:100]

        # Log the action
        logger.info(f"Fetching notes for user {user_id}: search='{search}', page={page}, page_size={page_size}")

        # Call repository with user_id filter
        notes, total, total_pages = await NoteRepository.get_all(
            db=db,
            user_id=user_id,
            search=search,
            page=page,
            page_size=page_size
        )

        # Log result
        logger.info(f"Found {total} notes for user {user_id} matching search")

        return notes, total, total_pages

    async def get_note(
        self,
        db: aiosqlite.Connection,
        note_id: int,
        user_id: int
    ) -> dict:
        """
        Get a single note by ID (only if owned by user).

        Args:
            db: Database connection
            note_id: Note ID to fetch
            user_id: Authenticated user ID

        Returns:
            Note dict

        Raises:
            InvalidNote: If note_id is invalid
            NoteNotFound: If note doesn't exist or not owned by user
        """
        # Validation: Note ID must be >= 1
        if not isinstance(note_id, int) or note_id < 1:
            logger.warning(f"Invalid note_id requested: {note_id}")
            raise InvalidNote("Note ID must be a positive integer")

        # Validation: User ID
        if not isinstance(user_id, int) or user_id < 1:
            logger.warning(f"Invalid user_id: {user_id}")
            raise InvalidNote("Invalid user ID")

        # Log the action
        logger.info(f"Fetching note {note_id} for user {user_id}")

        # Call repository
        note = await NoteRepository.get_by_id(db, note_id)

        # Check if note exists
        if not note:
            logger.warning(f"Note {note_id} not found")
            raise NoteNotFound(f"Note {note_id} not found")

        # Check ownership
        if note.get("user_id") != user_id:
            logger.warning(f"User {user_id} attempted to access note {note_id} owned by user {note.get('user_id')}")
            raise NoteNotFound(f"Note {note_id} not found")

        # Log success
        logger.info(f"Successfully fetched note {note_id}")

        return note

    async def create_note(
        self,
        db: aiosqlite.Connection,
        user_id: int,
        title: str,
        content: str,
        tags: List[int] = None
    ) -> dict:
        """
        Create a new note for authenticated user.

        Args:
            db: Database connection
            user_id: Authenticated user ID
            title: Note title
            content: Note content (markdown)
            tags: Optional list of tag IDs

        Returns:
            Created note dict (with id)

        Raises:
            InvalidNote: If validation fails
        """
        # Validation: User ID
        if not isinstance(user_id, int) or user_id < 1:
            logger.warning(f"Invalid user_id: {user_id}")
            raise InvalidNote("Invalid user ID")

        # Validation: Title must not be empty
        if not title or not title.strip():
            logger.warning("Attempted to create note with empty title")
            raise InvalidNote("Title cannot be empty")

        # Validation: Content must not be empty
        if not content or not content.strip():
            logger.warning("Attempted to create note with empty content")
            raise InvalidNote("Content cannot be empty")

        # Generate timestamp
        created_at = datetime.now().isoformat()

        # Log the action
        logger.info(f"Creating note for user {user_id}: {title[:50]}")

        # Call repository with user_id
        note = await NoteRepository.create(db, user_id, title, content, created_at)

        # Add tags to note if provided
        if tags and len(tags) > 0:
            from services import TagService
            tag_service = TagService()
            for tag_id in tags:
                try:
                    await tag_service.add_tag_to_note(db, note['id'], tag_id, user_id)
                except Exception as e:
                    logger.warning(f"Failed to add tag {tag_id} to note {note['id']}: {e}")

        # Log success
        logger.info(f"Successfully created note {note['id']} for user {user_id}")

        return note

    async def update_note(
        self,
        db: aiosqlite.Connection,
        note_id: int,
        user_id: int,
        title: str,
        content: str
    ) -> dict:
        """
        Update an existing note (only if owned by user).

        Args:
            db: Database connection
            note_id: Note ID to update
            user_id: Authenticated user ID
            title: New title
            content: New content (markdown)

        Returns:
            Updated note dict

        Raises:
            InvalidNote: If validation fails
            NoteNotFound: If note doesn't exist or not owned by user
        """
        # Validation: Note ID must be >= 1
        if not isinstance(note_id, int) or note_id < 1:
            logger.warning(f"Invalid note_id for update: {note_id}")
            raise InvalidNote("Note ID must be a positive integer")

        # Validation: User ID
        if not isinstance(user_id, int) or user_id < 1:
            logger.warning(f"Invalid user_id: {user_id}")
            raise InvalidNote("Invalid user ID")

        # Validation: Title must not be empty
        if not title or not title.strip():
            logger.warning(f"Attempted to update note {note_id} with empty title")
            raise InvalidNote("Title cannot be empty")

        # Validation: Content must not be empty
        if not content or not content.strip():
            logger.warning(f"Attempted to update note {note_id} with empty content")
            raise InvalidNote("Content cannot be empty")

        # Verify note ownership first
        existing_note = await NoteRepository.get_by_id(db, note_id)
        if not existing_note or existing_note.get("user_id") != user_id:
            logger.warning(f"User {user_id} attempted to update note {note_id} they don't own")
            raise NoteNotFound(f"Note {note_id} not found")

        # Generate timestamp
        updated_at = datetime.now().isoformat()

        # Log the action
        logger.info(f"Updating note {note_id} for user {user_id}")

        # Call repository
        note = await NoteRepository.update(db, note_id, title, content, updated_at)

        # Check if note was found
        if not note:
            logger.warning(f"Note {note_id} not found during update")
            raise NoteNotFound(f"Note {note_id} not found")

        # Log success
        logger.info(f"Successfully updated note {note_id}")

        return note

    async def delete_note(
        self,
        db: aiosqlite.Connection,
        note_id: int,
        user_id: int
    ) -> bool:
        """
        Delete a note by ID (only if owned by user).

        Args:
            db: Database connection
            note_id: Note ID to delete
            user_id: Authenticated user ID

        Returns:
            True if note was deleted

        Raises:
            InvalidNote: If note_id is invalid
            NoteNotFound: If note doesn't exist or not owned by user
        """
        # Validation: Note ID must be >= 1
        if not isinstance(note_id, int) or note_id < 1:
            logger.warning(f"Invalid note_id for delete: {note_id}")
            raise InvalidNote("Note ID must be a positive integer")

        # Validation: User ID
        if not isinstance(user_id, int) or user_id < 1:
            logger.warning(f"Invalid user_id: {user_id}")
            raise InvalidNote("Invalid user ID")

        # Verify note ownership first
        note = await NoteRepository.get_by_id(db, note_id)
        if not note or note.get("user_id") != user_id:
            logger.warning(f"User {user_id} attempted to delete note {note_id} they don't own")
            raise NoteNotFound(f"Note {note_id} not found")

        # Log the action
        logger.info(f"Deleting note {note_id} for user {user_id}")

        # Call repository
        deleted = await NoteRepository.delete(db, note_id)

        # Check if note was found
        if not deleted:
            logger.warning(f"Note {note_id} not found during delete")
            raise NoteNotFound(f"Note {note_id} not found")

        # Log success
        logger.info(f"Successfully deleted note {note_id}")

        return True