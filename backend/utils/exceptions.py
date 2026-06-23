class BearException(Exception):
    """Base exception for Bear Notes API"""
    status_code = 400
    detail = "Bad request"

    def __init__(self, message: str = None):
        self.detail = message or self.detail
        super().__init__(self.detail)

class NoteNotFound(BearException):
    """Raised when a note is not found"""
    status_code = 404
    detail = "Note not found"

class InvalidNote(BearException):
    """Raised when note data is invalid"""
    status_code = 400
    detail = "Invalid note data"

class InvalidTag(BearException):
    """Raised when tag data is invalid"""
    status_code = 400
    detail = "Invalid tag data"

class TagNotFound(BearException):
    """Raised when a tag is not found"""
    status_code = 404
    detail = "Tag not found"

class DatabaseError(BearException):
    """Raised when database operation fails"""
    status_code = 500
    detail = "Database error"
