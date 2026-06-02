"use client";

import { useState, type FormEvent } from "react";
import type { NoteCreate } from "@/lib/notes";

export default function NoteForm({ onCreate }: { onCreate: (note: NoteCreate) => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({ title, content });
    setTitle("");
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-2">
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-lg border border-foreground/10 p-2"
      />
      <input
        type="text"
        placeholder="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="rounded-lg border border-foreground/10 p-2"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="self-start rounded-lg border border-foreground/10 px-3 py-1 text-sm disabled:opacity-40"
      >
        Create Note
      </button>
    </form>
  );
}
