'use client';
import { useEffect, useRef, useState } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useMutateNote } from '@/hooks/useMutateNote'
import { useTagsData } from '@/hooks/useTagsData';
import { useAuth } from '@/hooks/useAuth';
import NotesList from './NotesList';
import EditorPane from './EditorPane';

export default function NotesApp() {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const { notes, total, pages, currentPage: apiCurrentPage, loading: notesLoading, error: notesError, fetchNotes } = useNotes(searchQuery, currentPage, 20);
    const { createNote, updateNote, deleteNote, loading: mutationLoading, error: mutationError } = useMutateNote();
    const { tags, noteTags, fetchTagsForNote, createTag, addTagToNote, removeTagFromNote } = useTagsData()
    const { user, logout } = useAuth()

    const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [newTagName, setNewTagName] = useState('');
    const [showTagInput, setShowTagInput] = useState(false);
    const [selectedTagsId, setSelectedTagsIds] = useState<number[]>([])

    const handleSelectNote = (noteId: number) => {
        const note = notes.find(n => n.id == noteId);
        if (note) {
            setSelectedNoteId(noteId);
            setTitle(note.title);
            setContent(note.content);
            setIsCreating(false);
            fetchTagsForNote(noteId);
        }
    }
    const handleCreateNew = () => {
        setSelectedNoteId(null);
        setTitle('');
        setContent('');
        setIsCreating(true);
        setSelectedTagsIds([]);
        setShowTagInput(false);
        setNewTagName('');

    }
    const handleSave = async () => {
        if (isCreating) {
            try {
                await createNote(title, content, selectedTagsId);
                setCurrentPage(1);
                setSelectedNoteId(null);
                setTitle('');
                setContent('');
                setIsCreating(false);
                setSelectedTagsIds([]);
                await fetchNotes();


            } catch (error) {
                console.error('Error creating note:', error);
            }
        } else if (selectedNoteId !== null) {
            try {
                await updateNote(selectedNoteId, title, content);
                setCurrentPage(1);
                setSelectedNoteId(null);
                setTitle('');
                setContent('');
                setIsCreating(false);
                await fetchNotes();

            }

            catch (error) {
                console.error('Error updating note:', error);
            }
        }
    }
    const handleDeleteNote = async (noteId: number) => {
        if (confirm('Delete this note?')) {
            try {
                await deleteNote(noteId);
                setCurrentPage(1)
                setSelectedNoteId(null);
                setTitle('');
                setContent('');
                setIsCreating(false);
                await fetchNotes();

            } catch (error) {
                console.error('Error deleting note:', error);
            }
        }
    }
    const handleCreateNewTag = async () => {
        if (!newTagName.trim()) {
            return
        }
        try {
            const newTag = await createTag(newTagName);
            if (newTag) {
                setNewTagName('')
                setShowTagInput(false)
            }
        } catch (err) {
            console.error('Error creating tag:', err)
        }
    }
    const handleAddTagToNote = async (tagId: number) => {
        if (isCreating) {
            // When creating: add to selected tags
            setSelectedTagsIds((prev) => [...prev, tagId]);
        } else if (selectedNoteId !== null) {
            // When editing: call API to add tag to note
            try {
                await addTagToNote(selectedNoteId, tagId);
            } catch (err) {
                console.error('Error adding tags', err)
            }
        }
    }


    useEffect(() => {
        // Only autosave if editing an existing note 
        if (selectedNoteId !== null && !isCreating) {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
            autoSaveTimerRef.current = setTimeout(async () => {
                setAutoSaveStatus('saving')
                try {
                    await updateNote(selectedNoteId, title, content);
                    setAutoSaveStatus('saved')
                    setTimeout(() => setAutoSaveStatus('idle'), 2000)

                } catch (error) {
                    console.error('autosaved failed', error)
                    setAutoSaveStatus('idle')
                }
            }, 2000)

        }
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [title, content, selectedNoteId, isCreating, updateNote])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px 20px',
                    backgroundColor: '#333',
                    color: 'white',
                    borderBottom: '1px solid #222',
                }}
            >
                <h1 style={{ margin: 0, fontSize: '20px' }}>Bear Notes</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {user && <span style={{ fontSize: '14px' }}>👤 {user.username}</span>}
                    <button
                        onClick={logout}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div
                style={{
                    display: 'flex',
                    flex: 1,
                    gap: '20px',
                    padding: '20px',
                    backgroundColor: '#f5f5f5',
                    overflow: 'hidden',
                }}
            >
            <NotesList
                notes={notes}
                selectedNoteId={selectedNoteId}
                searchQuery={searchQuery}
                currentPage={currentPage}
                pages={pages}
                loading={notesLoading}
                error={notesError}
                onSearchChange={setSearchQuery}
                onSelectNote={handleSelectNote}
                onCreateNew={handleCreateNew}
                onPageChange={setCurrentPage}
            />

            <EditorPane
                selectedNoteId={selectedNoteId}
                isCreating={isCreating}
                title={title}
                content={content}
                autoSaveStatus={autoSaveStatus}
                mutationLoading={mutationLoading}
                mutationError={mutationError}
                allTags={tags}
                selectedTagIds={selectedTagsId}
                noteTags={noteTags}
                showTagInput={showTagInput}
                newTagName={newTagName}
                onTitleChange={setTitle}
                onContentChange={setContent}
                onSave={handleSave}
                onDelete={() => handleDeleteNote(selectedNoteId!)}
                onShowTagInputChange={setShowTagInput}
                onNewTagNameChange={setNewTagName}
                onCreateTag={handleCreateNewTag}
                onAddTag={handleAddTagToNote}
                onRemoveTag={(tagId) => {
                    if (isCreating) {
                        setSelectedTagsIds((prev) => prev.filter((id) => id !== tagId));
                    } else if (selectedNoteId) {
                        removeTagFromNote(selectedNoteId, tagId);
                    }
                }}
            />
            </div>
        </div>
    )
}
