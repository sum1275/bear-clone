import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import type { Note } from "@/lib/notes";
import { extractTags, renderMarkdown } from "@/lib/markdown";
import type { FlagSets } from "@/lib/view";

export interface Draft {
  title: string;
  content: string;
}

interface EditorProps {
  note: Note | null;
  editing: boolean;
  draft: Draft;
  flags: FlagSets;
  inTrash: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onBack: () => void;
  onToggleInfo: () => void;
  onPin: () => void;
  onLock: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}

export function Editor({
  note,
  editing,
  draft,
  flags,
  inTrash,
  onChange,
  onStartEdit,
  onSave,
  onBack,
  onToggleInfo,
  onPin,
  onLock,
  onArchive,
  onTrash,
  onRestore,
  onDeleteForever,
}: EditorProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  if (!note) {
    return (
      <section className="editorpane">
        <div className="editempty">Select a note, or create a new one.</div>
      </section>
    );
  }

  // Wrap the current textarea selection with markdown markers (e.g. ** **).
  const wrap = (before: string, after: string = before) => {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e);
    onChange({ content: next });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = s + before.length;
      el.selectionEnd = e + before.length;
    });
  };

  // Prefix the line at the cursor (headings, lists, checkboxes).
  const prefixLine = (prefix: string) => {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: s, value } = el;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange({ content: next });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = s + prefix.length;
    });
  };

  const tags = extractTags(note.content);

  return (
    <section className="editorpane">
      <div className="edittop">
        <button className="only-narrow" onClick={onBack} aria-label="Back to list">
          <Icon name="back" />
        </button>
        <span className="biu">
          B <i>I</i> <u>U</u>
        </span>
        <span className="sp" />
        {!inTrash &&
          (editing ? (
            <button onClick={onSave} aria-label="Done editing">
              <Icon name="todo" />
            </button>
          ) : (
            <button onClick={onStartEdit} aria-label="Edit note">
              <Icon name="edit" />
            </button>
          ))}
        <button onClick={onToggleInfo} aria-label="Note info">
          <Icon name="info" />
        </button>
        <div className="menuwrap">
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="More actions">
            <Icon name="more" />
          </button>
          {menuOpen && (
            <div className="menu" onMouseLeave={() => setMenuOpen(false)}>
              {inTrash ? (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRestore();
                    }}
                  >
                    <Icon name="archive" /> Restore
                  </button>
                  <div className="sep" />
                  <button
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteForever();
                    }}
                  >
                    <Icon name="trash" /> Delete forever
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onPin();
                    }}
                  >
                    <Icon name="pin" /> {flags.pinned.has(note.id) ? "Unpin" : "Pin"}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLock();
                    }}
                  >
                    <Icon name={flags.locked.has(note.id) ? "unlock" : "lock"} />{" "}
                    {flags.locked.has(note.id) ? "Unlock" : "Lock"}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onArchive();
                    }}
                  >
                    <Icon name="archive" />{" "}
                    {flags.archived.has(note.id) ? "Unarchive" : "Archive"}
                  </button>
                  <div className="sep" />
                  <button
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onTrash();
                    }}
                  >
                    <Icon name="trash" /> Move to Trash
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="editscroll">
        {editing ? (
          <>
            <input
              className="titleinput"
              value={draft.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Title"
            />
            <textarea
              ref={areaRef}
              className="rawarea"
              value={draft.content}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder="Start writing…"
            />
            <div className="edtoolbar">
              <div className="fmtpill">
                <button onClick={() => prefixLine("# ")}>H</button>
                <span className="sep" />
                <button onClick={() => wrap("**")}>B</button>
                <button className="serifI" onClick={() => wrap("*")}>
                  I
                </button>
                <button onClick={() => wrap("~~")}>S</button>
                <button onClick={() => wrap("==")}>
                  <span className="mi hl" />
                </button>
                <span className="sep" />
                <button onClick={() => prefixLine("- ")}>
                  <span className="mi list">
                    <i />
                    <i />
                    <i />
                  </span>
                </button>
                <button onClick={() => prefixLine("- [ ] ")}>
                  <span className="mi box" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="doc mac">
            <h1>{draft.title || note.title || "Untitled"}</h1>
            {tags.length > 0 && (
              <div className="tagrow">
                {tags.map((tag) => (
                  <span className="tagchip" key={tag}>
                    <span className="h">#</span>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }} />
          </div>
        )}
      </div>
    </section>
  );
}
