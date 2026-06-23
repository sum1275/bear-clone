'use client'
import { useEffect, useState } from "react"
import { apiCall } from "@/lib/api-client"
interface Tag {
    id: number;
    name: string;
    created_at: string
}

export function useTagsData() {
    const [tags, setTags] = useState<Tag[]>([])
    const [noteTags, setNoteTags] = useState<Record<number, Tag[]>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)


    const fetchAllTags = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiCall('/api/notes/tags')
            if (!response.ok) {
                throw new Error(`Failed to fetch tags: ${response.status}`)
            }
            const data = await response.json();
            setTags(data.data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch tags');
            setTags([]);
        } finally {
            setLoading(false);
        }
    }

    const fetchTagsForNote = async (noteId: number) => {
        try {
            const response = await apiCall(`/api/notes/${noteId}/tags`);
            if (!response.ok) {
                throw new Error(`Failed to fetch tags: ${response.status}`);
            }
            const data = await response.json();
            setNoteTags((prev) => ({
                ...prev,
                [noteId]: data.data || [],
            }));
            return data.data || [];
        } catch (err) {
            console.error('Error fetching tags for note:', err);
            return [];
        }
    };
    const createTag = async (name: string) => {
        try {
            const response = await apiCall('/api/notes/tags', {
                method: 'POST',
                body: JSON.stringify({ name })
            })
            if (!response.ok) {
                throw new Error(`Failed to create tag : ${response.status}`)

            }
            const data = await response.json();
            const newTag = data.data;
            setTags((prev) => [...prev, newTag]);
            return newTag;
        } catch (err) {
            console.error('Error creating tag', err)
            return null;
        }
    }
    const addTagToNote = async (noteId: number, tagId: number) => {
        try {
            const response = await apiCall(`/api/notes/${noteId}/tags/${tagId}`, {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error(`Failed to add tag: ${response.status}`)
            }
            const tag = tags.find((t) => t.id == tagId)
            if (tag) {
                setNoteTags((prev) => ({
                    ...prev,
                    [noteId]: [...(prev[noteId] || []), tag],
                }))
            }
            return true;
        } catch (err) {
            console.error('Error adding tag to notes', err)
            return false;
        }
    }
    const removeTagFromNote = async (noteId: number, tagId: number) => {
        try {
            const response = await apiCall(`/api/notes/${noteId}/tags/${tagId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`Failed to remove tag: ${response.status}`);
            }
            setNoteTags((prev) => ({
                ...prev,
                [noteId]: (prev[noteId] || []).filter((t) => t.id !== tagId)
            }));
            return true;
        } catch (err) {
            console.error('Error removing tag from note', err)
            return false;
        }
    }
    useEffect(() => {
        fetchAllTags();
    }, [])
    return { tags, noteTags, loading, error, fetchTagsForNote, createTag, addTagToNote, removeTagFromNote }
}