import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons";
import { Menu, MenuItem, MenuSep, SubMenu } from "@/components/Menu";
import { LiveEditor, type LiveEditorHandle } from "@/components/LiveEditor";
import type { Note } from "@/lib/notes";
import { renderMarkdown } from "@/lib/markdown";
import { downloadText, safeFilename, stripTags } from "@/lib/download";
import type { FlagSets } from "@/lib/view";

export interface Draft {
  title: string;
  content: string;
}

interface EditorProps {
  note: Note | null;
  draft: Draft;
  flags: FlagSets;
  inTrash: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onBack: () => void;
  onToggleInfo: () => void;
  onSearch: () => void;
  onPin: () => void;
  onLock: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
  keepTags: boolean;
}

export function Editor({
  note,
  draft,
  flags,
  inTrash,
  onChange,
  onBack,
  onToggleInfo,
  onSearch,
  onPin,
  onLock,
  onArchive,
  onTrash,
  onRestore,
  onDeleteForever,
  keepTags,
}: EditorProps) {
  const editorRef = useRef<LiveEditorHandle>(null);
  const readOnly = inTrash;

  // Focus a freshly composed (empty / heading-only) note so the caret is ready.
  useEffect(() => {
    const bare = note ? note.content.replace(/^\s*#{1,6}\s*/, "").trim() : "x";
    if (note && bare === "" && !readOnly) {
      requestAnimationFrame(() => editorRef.current?.focus());
    }
    // Only re-run on note identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  if (!note) {
    return (
      <section className="editorpane">
        <div className="editempty">Select a note, or create a new one.</div>
      </section>
    );
  }

  const title = draft.title || note.title || "Untitled";

  // ---- more-menu actions ----
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  };
  // Strip markdown to readable plain text (keeps line breaks, unlike snippet()).
  const toPlainText = (md: string): string =>
    md
      .replace(/```\w*\n?([\s\S]*?)```/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*]\s+\[[ xX]\]\s+/gm, "")
      .replace(/^\s*[-*]\s+/gm, "• ")
      .replace(/^\s*>\s?/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/~~([^~]+)~~/g, "$1")
      .replace(/==([^=]+)==/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const exportNote = () =>
    downloadText(
      safeFilename(title, "md"),
      `# ${title}\n\n${keepTags ? draft.content : stripTags(draft.content)}`,
    );
  const copyLink = () => copy(`${location.origin}/?note=${note.id}`);

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
        <button onClick={onToggleInfo} aria-label="Note info">
          <Icon name="info" />
        </button>
        <Menu label="More actions" align="right" width={214} trigger={<Icon name="more" />}>
          <MenuItem icon="search" onSelect={onSearch}>
            Search
          </MenuItem>
          <MenuItem icon="stats" onSelect={onToggleInfo}>
            Toggle Statistics
          </MenuItem>
          <MenuSep />
          <MenuItem icon="export" onSelect={exportNote}>
            Export…
          </MenuItem>
          <SubMenu icon="copy" label="Copy As">
            <MenuItem onSelect={() => copy(draft.content)}>Markdown</MenuItem>
            <MenuItem onSelect={() => copy(toPlainText(draft.content))}>Plain Text</MenuItem>
            <MenuItem onSelect={() => copy(renderMarkdown(draft.content))}>HTML</MenuItem>
          </SubMenu>
          <MenuItem icon="link" onSelect={copyLink}>
            Copy Link
          </MenuItem>
          <MenuSep />
          {inTrash ? (
            <>
              <MenuItem icon="archive" onSelect={onRestore}>
                Restore
              </MenuItem>
              <MenuItem icon="trash" danger onSelect={onDeleteForever}>
                Delete Forever
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem icon="pin" onSelect={onPin}>
                {flags.pinned.has(note.id) ? "Unpin" : "Pin"}
              </MenuItem>
              <MenuItem icon={flags.locked.has(note.id) ? "unlock" : "lock"} onSelect={onLock}>
                {flags.locked.has(note.id) ? "Unlock" : "Lock"}
              </MenuItem>
              <MenuItem icon="archive" onSelect={onArchive}>
                {flags.archived.has(note.id) ? "Unarchive" : "Archive"}
              </MenuItem>
              <MenuItem icon="trash" danger onSelect={onTrash}>
                Move to Trash
              </MenuItem>
            </>
          )}
        </Menu>
      </div>

      <div className="editscroll">
        <div className="doc mac live">
          <input
            className="livetitle"
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Title"
            readOnly={readOnly}
          />
          <LiveEditor
            ref={editorRef}
            value={draft.content}
            onChange={(content) => onChange({ content })}
            readOnly={readOnly}
          />
        </div>
      </div>

      {!readOnly && (
        <div className="edtoolbar">
          {/* preventDefault keeps the editor's focus + selection so the
              formatting buttons can act on it */}
          <div className="fmtpill" onMouseDown={(e) => e.preventDefault()}>
            <button onClick={() => editorRef.current?.toggleLinePrefix("# ")}>H</button>
            <span className="sep" />
            <button onClick={() => editorRef.current?.wrapInline("**")}>B</button>
            <button className="serifI" onClick={() => editorRef.current?.wrapInline("*")}>
              I
            </button>
            <button onClick={() => editorRef.current?.wrapInline("~~")}>S</button>
            <button onClick={() => editorRef.current?.wrapInline("==")}>
              <span className="mi hl" />
            </button>
            <span className="sep" />
            <button onClick={() => editorRef.current?.toggleLinePrefix("- ")}>
              <span className="mi list">
                <i />
                <i />
                <i />
              </span>
            </button>
            <button onClick={() => editorRef.current?.toggleLinePrefix("- [ ] ")}>
              <span className="mi box" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
