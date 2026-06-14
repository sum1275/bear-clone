'use client';
import { useState } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useMutateNote } from '@/hooks/useMutateNote'


export default function NotesApp() {
    const { notes, loading: notesLoading, error: notesError, refetch } = useNotes();
    const { createNote, updateNote, deleteNote, loading: mutationLoading, error: mutationError } = useMutateNote();

    const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleSelectNote = (noteId: number) => {
        const note = notes.find(n => n.id == noteId);
        if (note) {
            setSelectedNoteId(noteId);
            setTitle(note.title);
            setContent(note.content);
            setIsCreating(false);
        }
    }
    const handleCreateNew = () => {
        setSelectedNoteId(null);
        setTitle('');
        setContent('');
        setIsCreating(true);

    }
    const handleSave = async () => {
        if (isCreating) {
            try {
                await createNote(title, content);
                refetch();
                setSelectedNoteId(null);
                setTitle('');
                setContent('');
                setIsCreating(false);

            } catch (error) {
                console.error('Error creating note:', error);
            }
        } else if (selectedNoteId !== null) {
            try {
                await updateNote(selectedNoteId, title, content);
                refetch();
                setSelectedNoteId(null);
                setTitle('');
                setContent('');
                setIsCreating(false);
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
                refetch();
                setSelectedNoteId(null);
                setTitle('');
                setContent('');
                setIsCreating(false);
            } catch (error) {
                console.error('Error deleting note:', error);
            }
        }
    }

    return (<div

        style={{
            display: 'flex',
            height: '100vh',
            gap: '20px',
            backgroundColor: '#f5f5f5',

        }}>
        <div
            style={{
                flex: 1, border: '1px solid #ddd',
                padding: '15px',
                overflowY: 'auto',
                backgroundColor: 'white',
                borderRadius: '8px',

            }}>
            <h2
                style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}
            >

                Notes ({notes.length})

            </h2>
            <button
                onClick={handleCreateNew}
                style={{
                    width: '100%',
                    marginBottom: '15px',
                    padding: '10px 12px',
                    color: 'red',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                }}
            >+ New Note</button>
            {notesLoading ? <p style={{ color: '#666', textAlign: 'center' }}>
                Loading Notes ...</p> : null}
            {notesError ? <p style={{ color: 'red', textAlign: 'center' }}>
                Error: {notesError}
            </p> : null}
            <ul
                style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                }}
            >
                {notes.map(note => (
                    <li
                        key={note.id}
                        onClick={() => handleSelectNote(note.id)}
                        style={{
                            padding: '12px',
                            marginBottom: '10px',
                            border: selectedNoteId == note.id ? '2px solid #007bff' : '1px solid #ddd',
                            cursor: 'pointer',
                            backgroundColor: selectedNoteId == note.id ? '#e7f3ff' : '#fafafa',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease'
                        }}>


                        <strong style={{
                            color: '#333', display: 'block'
                        }}>
                            {note.title}
                        </strong>
                        <small style={{ color: '#666' }}>{new Date(note.updated_at).toLocaleDateString()}</small>
                    </li>
                ))}
            </ul>
        </div>

        <div
            style={{ flex: 1, border: '1px solid #ddd', padding: '15px', display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '8px' }}
        >

            {selectedNoteId == null && !isCreating ? (<div

                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>

                <p style={{ fontSize: '16px' }}>Select a note or create a new one</p>

            </div>) : (
                <>
                    <input type="text"
                        placeholder='Note Title'
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{
                            padding: '10px',
                            marginBottom: '10px',
                            fontSize: '18px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            outline: 'none',
                        }}

                    />

                    <textarea
                        placeholder='Content (markdown support)'
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '10px',
                            marginBottom: '15px',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            resize: 'none',
                            outline: 'none',
                        }}
                    />
                    {mutationError && (<div style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>
                        Error:{mutationError}
                    </div>)}
                    <div style={{ display: 'flex', gap: '10px' }}>

                        <button
                            onClick={handleSave}
                            disabled={mutationLoading}
                            style={{
                                flex: 1,
                                padding: '10px 16px',
                                backgroundColor: mutationLoading ? '#cccccc' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: mutationLoading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                            }}

                        >

                            {mutationLoading ? 'Saving' : 'Save'}
                        </button>


                        {selectedNoteId && (
                            <button
                                onClick={() => handleDeleteNote(selectedNoteId)}
                                disabled={mutationLoading}
                                style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    backgroundColor: mutationLoading ? '#cccccc' : '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: mutationLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                }}

                            >Delete</button>
                        )}
                    </div>

                </>)}
        </div>


    </div>)
}