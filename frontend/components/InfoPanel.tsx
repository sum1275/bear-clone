import { useState } from "react";
import { Icon } from "@/components/icons";
import type { Note } from "@/lib/notes";
import { extractTags, extractToc, noteStats } from "@/lib/markdown";

interface InfoPanelProps {
  note: Note;
  onClose: () => void;
}

export function InfoPanel({ note, onClose }: InfoPanelProps) {
  const [tab, setTab] = useState<"info" | "toc">("info");
  const stats = noteStats(note.content);
  const toc = extractToc(note.content);
  const tags = extractTags(note.content);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <aside className="infopane">
      <div className="grip only-narrow" />
      <div className="ihead">
        <button className="icobtn only-narrow" onClick={onClose} aria-label="Close info">
          <Icon name="x" />
        </button>
      </div>

      <div className="tabs">
        <button className={tab === "info" ? "on" : ""} onClick={() => setTab("info")}>
          Info
        </button>
        <button className={tab === "toc" ? "on" : ""} onClick={() => setTab("toc")}>
          Outline
        </button>
      </div>

      {tab === "info" ? (
        <div className="tabpane">
          <div className="statgrid">
            <div className="statbig">
              <div className="v">{stats.words}</div>
              <div className="k">Words</div>
            </div>
            <div className="statbig">
              <div className="v">{stats.readTime}m</div>
              <div className="k">Read time</div>
            </div>
          </div>
          <div className="statrow">
            <span>Characters</span>
            <b>{stats.chars}</b>
          </div>
          <div className="statrow">
            <span>Paragraphs</span>
            <b>{stats.paragraphs}</b>
          </div>
          <div className="statrow">
            <span>Created</span>
            <b>{fmt(note.created_at)}</b>
          </div>
          <div className="statrow">
            <span>Modified</span>
            <b>{fmt(note.updated_at)}</b>
          </div>
          {tags.length > 0 && (
            <div className="chips" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
              {tags.map((tag) => (
                <span className="tagchip" key={tag}>
                  <span className="h">#</span>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="tabpane">
          {toc.length === 0 ? (
            <div className="listempty" style={{ padding: "24px 0" }}>
              No headings yet.
            </div>
          ) : (
            toc.map((entry, idx) => (
              <div key={idx} className={`tocrow${entry.level === 2 ? " l2" : entry.level === 3 ? " l3" : ""}`}>
                {entry.text}
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
