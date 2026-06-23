from datetime import datetime
from typing import List,Dict
from repositories.note_repository import TagRepository
from utils.logger import logger
from utils.exceptions import InvalidTag

class TagService:
     """ Business logic for tags"""
     @staticmethod
     async def create_tag(db,name:str) -> Dict:
         """ Create anew tag with validation"""
         #Validate
         if not name or not name.strip():
             raise InvalidTag('Tag name cannot be empty')
         name=name.strip()
         
         if(len(name) >50):
              raise InvalidTag('Tag name too long (max 50 chars)')
          
         
         logger.info(f"Creating tag:{name}")
         
         created_at=datetime.now().isoformat()
         tag=await TagRepository.create_tag(db,name,created_at)
         
         logger.info(f"Tag Created: {tag}")
         return tag
     
     @staticmethod
     async def get_all_tags(db) -> List[Dict]:
         """ Get all tags"""
         logger.info('Fetching all tags')
         tags=await TagRepository.get_all_tags(db)
         logger.info(f"Found {len(tags)} tags")
         return tags

     @staticmethod
     async def add_tag_to_note(db, note_id: int, tag_id: int, user_id: int = None) -> bool:
         """Add a tag to a note (optionally verify user ownership)"""
         if note_id < 1 or tag_id < 1:
             raise InvalidTag("Invalid note_id or tag_id")
         if user_id and user_id < 1:
             raise InvalidTag("Invalid user_id")

         # If user_id provided, verify note ownership
         if user_id:
             from repositories.note_repository import NoteRepository
             note = await NoteRepository.get_by_id(db, note_id)
             if not note or note.get("user_id") != user_id:
                 raise InvalidTag("Note not found or not owned by user")

         logger.info(f"Adding tag {tag_id} to note {note_id}")
         success = await TagRepository.add_tag_to_note(db, note_id, tag_id)
         if not success:
             raise InvalidTag("Failed to add tag to note (may already exist)")
         logger.info(f"Tag {tag_id} added to note {note_id}")
         return success

     @staticmethod
     async def get_tags_for_note(db, note_id: int, user_id: int = None) -> List[Dict]:
         """Get all tags for a specific note (optionally verify user ownership)"""
         if note_id < 1:
             raise InvalidTag("Invalid note_id")
         if user_id and user_id < 1:
             raise InvalidTag("Invalid user_id")

         # If user_id provided, verify note ownership
         if user_id:
             from repositories.note_repository import NoteRepository
             note = await NoteRepository.get_by_id(db, note_id)
             if not note or note.get("user_id") != user_id:
                 raise InvalidTag("Note not found or not owned by user")

         logger.info(f"Fetching tags for note {note_id}")
         tags = await TagRepository.get_tags_for_note(db, note_id)
         logger.info(f"Found {len(tags)} tags for note {note_id}")
         return tags

     @staticmethod
     async def remove_tag_from_note(db, note_id: int, tag_id: int, user_id: int = None) -> bool:
         """Remove a tag from a note (optionally verify user ownership)"""
         if note_id < 1 or tag_id < 1:
             raise InvalidTag("Invalid note_id or tag_id")
         if user_id and user_id < 1:
             raise InvalidTag("Invalid user_id")

         # If user_id provided, verify note ownership
         if user_id:
             from repositories.note_repository import NoteRepository
             note = await NoteRepository.get_by_id(db, note_id)
             if not note or note.get("user_id") != user_id:
                 raise InvalidTag("Note not found or not owned by user")

         logger.info(f"Removing tag {tag_id} from note {note_id}")
         success = await TagRepository.remove_tag_from_note(db, note_id, tag_id)
         logger.info(f"Tag {tag_id} removed from note {note_id}")
         return success