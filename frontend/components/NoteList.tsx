import type { RefObject } from "react";
import { Icon } from "@/components/icons";
import { Menu, MenuHeader, MenuItem, MenuSep, SubMenu } from "@/components/Menu";
import type { Note } from "@/lib/notes";
import { extractTags } from "@/lib/markdown";
import { downloadText, stripTags } from "@/lib/download";
import type { Filter, FilterType, FlagSets, PreviewStyle, SortKey } from "@/lib/view";
import { filterTitle, relativeTime, snippet, splitEmoji } from "@/lib/view";
import type { IconName } from "@/components/icons";

interface NoteListProps {
  notes: Note[];
  selectedId: number | null;
  flags: FlagSets;
  query: string;
  filter: Filter;
  onFilter: (f: Filter) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  preview: PreviewStyle;
  onPreview: (p: PreviewStyle) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  onQuery: (q: string) => void;
  onSelect: (note: Note) => void;
  onCompose: () => void;
  onOpenDrawer: () => void;
  keepTags: boolean;
}

// The library switcher items, with their ⌥⌘ shortcuts (mirrors NotesApp's
// keyboard handler).
const LIBRARY: { type: FilterType; label: string; icon: IconName; key: string }[] = [
  { type: "all", label: "Notes", icon: "doc", key: "⌥⌘1" },
  { type: "untagged", label: "Untagged", icon: "inbox", key: "⌥⌘2" },
  { type: "todo", label: "Todo", icon: "todo", key: "⌥⌘3" },
  { type: "today", label: "Today", icon: "today", key: "⌥⌘4" },
  { type: "locked", label: "Locked", icon: "lock", key: "⌥⌘5" },
  { type: "pinned", label: "Pinned", icon: "pin", key: "⌥⌘6" },
  { type: "archive", label: "Archive", icon: "archive", key: "⌥⌘9" },
  { type: "trash", label: "Trash", icon: "trash", key: "⌥⌘0" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "modified", label: "Date Modified" },
  { key: "created", label: "Date Created" },
  { key: "title", label: "Title" },
];

const PREVIEWS: { key: PreviewStyle; label: string }[] = [
  { key: "title", label: "Title Only" },
  { key: "one", label: "Single Line" },
  { key: "multi", label: "Multiple Lines" },
];

export function NoteList({
  notes,
  selectedId,
  flags,
  query,
  filter,
  onFilter,
  sort,
  onSort,
  preview,
  onPreview,
  searchRef,
  onQuery,
  onSelect,
  onCompose,
  onOpenDrawer,
  keepTags,
}: NoteListProps) {
  const title = filterTitle(filter);

  const exportLibrary = () => {
    // One markdown file with every note in the current view, separated by ---.
    const body = notes
      .map((n) => {
        const content = keepTags ? n.content : stripTags(n.content);
        return `# ${n.title || "Untitled"}\n\n${content}`.trim();
      })
      .join("\n\n---\n\n");
    const name = title.replace(/[^\w]+/g, "-").toLowerCase() || "notes";
    downloadText(`${name}.md`, body || "");
  };

  return (
    <section className="notelist">
      <div className="listtop">
        <button className="only-narrow" onClick={onOpenDrawer} aria-label="Open menu">
          <Icon name="menu" />
        </button>

        <Menu
          label="Switch library"
          triggerClass="libpick"
          align="left"
          width={236}
          trigger={
            <>
              <span className="t">{title}</span>
              <Icon name="chevD" className="lchev" />
            </>
          }
        >
          <MenuHeader>
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </MenuHeader>
          <SubMenu icon="sort" label="Sorting">
            {SORTS.map((s) => (
              <MenuItem key={s.key} checked={sort === s.key} onSelect={() => onSort(s.key)}>
                {s.label}
              </MenuItem>
            ))}
          </SubMenu>
          <SubMenu icon="rows" label="Preview Style">
            {PREVIEWS.map((p) => (
              <MenuItem key={p.key} checked={preview === p.key} onSelect={() => onPreview(p.key)}>
                {p.label}
              </MenuItem>
            ))}
          </SubMenu>
          <MenuItem icon="export" onSelect={exportLibrary}>
            Export…
          </MenuItem>
          <MenuSep />
          {LIBRARY.map((row) => (
            <MenuItem
              key={row.type}
              icon={row.icon}
              shortcut={row.key}
              current={filter.type === row.type}
              onSelect={() => onFilter({ type: row.type })}
            >
              {row.label}
            </MenuItem>
          ))}
        </Menu>

        <button className="only-wide" onClick={onCompose} aria-label="New note">
          <Icon name="edit" />
        </button>
      </div>

      <div className="psearch">
        <Icon name="search" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search notes"
        />
      </div>

      <div className="listscroll" data-preview={preview}>
        {notes.length === 0 ? (
          <div className="listempty">No notes here yet.</div>
        ) : (
          notes.map((note) => {
            const [emoji, rest] = splitEmoji(note.title || "");
            const tags = extractTags(note.content).slice(0, 3);
            const pinned = flags.pinned.has(note.id);
            const locked = flags.locked.has(note.id);
            const previewText = snippet(note.content);
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
                {previewText && <div className="ms">{previewText}</div>}
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
