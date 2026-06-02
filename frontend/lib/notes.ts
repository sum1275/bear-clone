import type { components } from "@/lib/api";

export type Note = components["schemas"]["Note"];
export type NoteCreate = components["schemas"]["NoteCreate"];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`${options?.method ?? "GET"} ${path} failed: ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const listNotes = () => request<Note[]>("/notes");

export const createNote = (note: NoteCreate) =>
  request<Note>("/notes", { method: "POST", body: JSON.stringify(note) });

export const updateNote = (id: number, note: NoteCreate) =>
  request<Note>(`/notes/${id}`, { method: "PUT", body: JSON.stringify(note) });

export const deleteNote = (id: number) =>
  request<void>(`/notes/${id}`, { method: "DELETE" });
