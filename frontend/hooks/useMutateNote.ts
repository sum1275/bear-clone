'use client';

import { useState } from 'react';
interface Note {
    id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
}
export function useMutateNote() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const createNote = async (title: string, content: string): Promise<Note> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content }),
            });
            if (!response.ok) {
                throw new Error(`Failed to create note ${response.status}`);
            }
            const newNote: Note = await response.json();
            return newNote;
        } catch (error) {
            const errormsg = error instanceof Error ? error.message : 'Unknown error';
            setError(errormsg);
            throw error;
        } finally {
            setLoading(false);
        }
    };
    const updateNote = async (id: number, title: string, content: string): Promise<Note> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/notes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content }),
            })
            if (!response.ok) {
                throw new Error(`Failed to update note ${response.status}`);
            }
            const updatedNote: Note = await response.json();
            return updatedNote;


        } catch (error) {
            const errormsg = error instanceof Error ? error.message : 'Unknown error';
            setError(errormsg);
            throw error;


        } finally {
            setLoading(false);
        }
    }
    const deleteNote = async (id: number): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/notes/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`Failed to delete note ${response.status}`);

            }
        } catch (error) {

            const errormsg = error instanceof Error ? error.message : 'Unknown error';

            setError(errormsg);
            throw error;
        } finally {
            setLoading(false);
        }
    }
    return { createNote, updateNote, deleteNote, loading, error };
}