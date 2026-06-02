import { Icon } from "@/components/icons";
import type { Note } from "@/lib/notes";
import { extractTags } from "@/lib/markdown";
import type { FlagSets } from "@/lib/view";
import { relativeTime, snippet, splitEmoji } from "@/lib/view";

interface NoteListProps {
  title: string;
  notes: Note[];
  selectedId: number | null;
  flags: FlagSets;
  query: string;
  onQuery: (q: string) => void;
  onSelect: (note: Note) => void;
  onCompose: () => void;
  onOpenDrawer: () => void;
}

export function NoteList({
  title,
  notes,
  selectedId,
  flags,
  query,
  onQuery,
  onSelect,
  onCompose,
  onOpenDrawer,
}: NoteListProps) {
  return (
    <section className="notelist">
      <div className="listtop">
        <button className="only-narrow" onClick={onOpenDrawer} aria-label="Open menu">
          <Icon name="menu" />
        </button>
        <span className="t">{title}</span>
        <button className="only-wide" onClick={onCompose} aria-label="New note">
          <Icon name="edit" />
        </button>
      </div>

      <div className="psearch">
        <Icon name="search" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search notes"
        />
      </div>

      <div className="listscroll">
        {notes.length === 0 ? (
          <div className="listempty">No notes here yet.</div>
        ) : (
          notes.map((note) => {
            const [emoji, rest] = splitEmoji(note.title || "");
            const tags = extractTags(note.content).slice(0, 3);
            const pinned = flags.pinned.has(note.id);
            const locked = flags.locked.has(note.id);
            const preview = snippet(note.content);
            return (
              <article
                key={note.id}
                className={`mcard${note.id === selectedId ? " sel" : ""}${pinned ? " pinned" : ""}`}
                onClick={() => onSelect(note)}
              >
                <div className="mt">
                  {emoji ? `${emoji} ` : ""}
                  {rest || "Untitled"}
                </div>
                {preview && <div className="ms">{preview}</div>}
                <div className="mm">
                  {pinned && (
                    <span className="pin">
                      <Icon name="pin" width={12} height={12} />
                    </span>
                  )}
                  {locked && <Icon name="lock" width={12} height={12} />}
                  <span>{relativeTime(note.updated_at)}</span>
                </div>
                {tags.length > 0 && (
                  <div className="chips">
                    {tags.map((tag) => (
                      <span className="tagchip" key={tag}>
                        <span className="h">#</span>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      <button className="fab" onClick={onCompose} aria-label="New note">
        <Icon name="plus" />
      </button>
    </section>
  );
}
