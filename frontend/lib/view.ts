// View-layer helpers shared by the app shell: the filter model, the ephemeral
// (session-only) flag sets, and small pure functions for deriving what the note
// list shows. None of this is persisted — pin/lock/archive/trash live only in
// React state per the "frontend only" scope.

import type { Note } from "@/lib/notes";
import { extractTags } from "@/lib/markdown";

export type FilterType =
  | "all"
  | "untagged"
  | "todo"
  | "today"
  | "locked"
  | "pinned"
  | "archive"
  | "trash"
  | "tag";

export interface Filter {
  type: FilterType;
  tag?: string; // set only when type === "tag"
}

// Note-list ordering and card density — set from the "Notes ⌄" library menu.
export type SortKey = "modified" | "created" | "title";
export type PreviewStyle = "small" | "medium" | "large";

// Ephemeral per-note flags. Membership = flag is on.
export interface FlagSets {
  pinned: Set<number>;
  locked: Set<number>;
  archived: Set<number>;
  trashed: Set<number>;
}

export function emptyFlags(): FlagSets {
  return { pinned: new Set(), locked: new Set(), archived: new Set(), trashed: new Set() };
}

// Split a leading emoji off a title so the list can show it as an avatar.
// Returns [emoji | null, rest].
export function splitEmoji(title: string): [string | null, string] {
  const m = title.match(/^(\p{Extended_Pictographic}(?:️)?)\s*(.*)$/u);
  return m ? [m[1], m[2]] : [null, title];
}

// "just now" / "5m" / "3h" / "2d" / "Apr 9" — compact, like Bear's list.
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 45) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const RE_CHECKBOX = /^\s*[-*]\s+\[( |x)\]\s+/im;
export function hasCheckbox(content: string): boolean {
  return RE_CHECKBOX.test(content);
}

// A note "has" a tag if it carries that exact tag or any nested descendant.
export function hasTag(content: string, tag: string): boolean {
  return extractTags(content).some((t) => t === tag || t.startsWith(`${tag}/`));
}

// Plain-text preview for a list card: drop the leading H1 (it's the title),
// strip the most common markdown punctuation, collapse whitespace.
export function snippet(content: string): string {
  return content
    .replace(/^#\s+.*$/m, "") // first heading = title, shown separately
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[([^\]]+?)\]\]/g, "$1") // wikilink -> label
    .replace(/\[([^\]]+?)\]\([^)]*\)/g, "$1") // link -> label
    .replace(/^\s*[-*]\s+\[[ xX]\]\s*/gm, "") // checkbox markers
    .replace(/[#>*_~`>|[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Does a note pass the current filter? Trash/archive are exclusive buckets:
// trashed notes appear only under "trash", archived only under "archive".
export function matchesFilter(note: Note, f: Filter, flags: FlagSets): boolean {
  const trashed = flags.trashed.has(note.id);
  const archived = flags.archived.has(note.id);

  if (f.type === "trash") return trashed;
  if (trashed) return false;
  if (f.type === "archive") return archived;
  if (archived) return false;

  switch (f.type) {
    case "all":
      return true;
    case "untagged":
      return extractTags(note.content).length === 0;
    case "todo":
      return hasCheckbox(note.content);
    case "today":
      return isToday(note.updated_at);
    case "locked":
      return flags.locked.has(note.id);
    case "pinned":
      return flags.pinned.has(note.id);
    case "tag":
      return f.tag ? hasTag(note.content, f.tag) : true;
    default:
      return true;
  }
}

// Order notes for the list: pinned always float to the top, then by sort key.
export function sortNotes(notes: Note[], key: SortKey, flags: FlagSets): Note[] {
  const ts = (s: string) => new Date(s).getTime() || 0;
  return [...notes].sort((a, b) => {
    const pin = (flags.pinned.has(b.id) ? 1 : 0) - (flags.pinned.has(a.id) ? 1 : 0);
    if (pin !== 0) return pin;
    if (key === "title") return (a.title || "").localeCompare(b.title || "");
    if (key === "created") return ts(b.created_at) - ts(a.created_at);
    return ts(b.updated_at) - ts(a.updated_at);
  });
}

// Free-text search across title + content (case-insensitive).
export function matchesQuery(note: Note, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
}

// Human label for the note-list header, given the active filter.
export function filterTitle(f: Filter): string {
  switch (f.type) {
    case "all":
      return "All Notes";
    case "untagged":
      return "Untagged";
    case "todo":
      return "To-Do";
    case "today":
      return "Today";
    case "locked":
      return "Locked";
    case "pinned":
      return "Pinned";
    case "archive":
      return "Archive";
    case "trash":
      return "Trash";
    case "tag":
      return f.tag ? `#${f.tag}` : "Tag";
  }
}
