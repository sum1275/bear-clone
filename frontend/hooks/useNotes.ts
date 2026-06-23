'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api-client';

interface Note {
  id: number;
  title: string;
  content: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}
interface NotesResponse {
  notes: Note[];
  total: number;
  pages: number;
  current_page: number;
}

export function useNotes(search: string = '', page: number = 1, limit: number = 20) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        page_size: limit.toString(),
      })
      const response = await apiCall(`/api/notes?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }
      const data: NotesResponse = await response.json();
      setNotes(data.notes);
      setTotal(data.total);
      setPages(data.pages);
      setCurrentPage(data.current_page);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [search, page, limit]);

  return { notes, loading, error, currentPage, total, pages, fetchNotes };
}