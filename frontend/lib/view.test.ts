import { describe, it, expect } from "vitest";
import type { Note } from "@/lib/notes";
import {
  emptyFlags,
  filterTitle,
  hasCheckbox,
  hasTag,
  isToday,
  matchesFilter,
  matchesQuery,
  relativeTime,
  snippet,
  splitEmoji,
  type FlagSets,
} from "@/lib/view";

function note(id: number, content: string, updated = "2026-01-01T00:00:00Z"): Note {
  return { id, title: `n${id}`, content, created_at: updated, updated_at: updated };
}

describe("splitEmoji", () => {
  it("splits a leading emoji from the rest", () => {
    expect(splitEmoji("🐻 Field Notes")).toEqual(["🐻", "Field Notes"]);
  });
  it("returns null emoji when there is none", () => {
    expect(splitEmoji("Plain title")).toEqual([null, "Plain title"]);
  });
});

describe("relativeTime", () => {
  it("formats recent times compactly", () => {
    const now = Date.now();
    expect(relativeTime(new Date(now - 5000).toISOString())).toBe("just now");
    expect(relativeTime(new Date(now - 5 * 60_000).toISOString())).toBe("5m");
    expect(relativeTime(new Date(now - 3 * 3600_000).toISOString())).toBe("3h");
    expect(relativeTime(new Date(now - 2 * 86400_000).toISOString())).toBe("2d");
  });
});

describe("isToday / hasCheckbox / hasTag", () => {
  it("isToday is true for now, false for the past", () => {
    expect(isToday(new Date().toISOString())).toBe(true);
    expect(isToday("2020-01-01T00:00:00Z")).toBe(false);
  });
  it("hasCheckbox detects todo lines", () => {
    expect(hasCheckbox("- [ ] thing")).toBe(true);
    expect(hasCheckbox("- [x] done")).toBe(true);
    expect(hasCheckbox("just a list\n- item")).toBe(false);
  });
  it("hasTag matches exact and descendant tags", () => {
    expect(hasTag("#science/wildlife", "science")).toBe(true);
    expect(hasTag("#science", "science")).toBe(true);
    expect(hasTag("#sciencey", "science")).toBe(false);
  });
});

describe("snippet", () => {
  it("drops the title heading and checkbox markers", () => {
    const s = snippet("# Title\n\n- [x] packed\nsome body");
    expect(s).not.toContain("Title");
    expect(s).not.toContain("[x]");
    expect(s).toContain("packed");
    expect(s).toContain("some body");
  });
});

describe("matchesFilter", () => {
  const flags = (over: Partial<FlagSets> = {}): FlagSets => ({ ...emptyFlags(), ...over });

  it("all shows non-trashed, non-archived notes", () => {
    expect(matchesFilter(note(1, "x"), { type: "all" }, flags())).toBe(true);
  });
  it("trashed notes appear only under trash", () => {
    const f = flags({ trashed: new Set([1]) });
    expect(matchesFilter(note(1, "x"), { type: "all" }, f)).toBe(false);
    expect(matchesFilter(note(1, "x"), { type: "trash" }, f)).toBe(true);
  });
  it("archived notes appear only under archive", () => {
    const f = flags({ archived: new Set([1]) });
    expect(matchesFilter(note(1, "x"), { type: "all" }, f)).toBe(false);
    expect(matchesFilter(note(1, "x"), { type: "archive" }, f)).toBe(true);
  });
  it("untagged matches notes with no tags", () => {
    expect(matchesFilter(note(1, "plain"), { type: "untagged" }, flags())).toBe(true);
    expect(matchesFilter(note(2, "#tagged"), { type: "untagged" }, flags())).toBe(false);
  });
  it("todo matches notes with a checkbox", () => {
    expect(matchesFilter(note(1, "- [ ] x"), { type: "todo" }, flags())).toBe(true);
    expect(matchesFilter(note(2, "no todo"), { type: "todo" }, flags())).toBe(false);
  });
  it("tag matches by tag name", () => {
    const f = { type: "tag", tag: "science" } as const;
    expect(matchesFilter(note(1, "#science/wildlife"), f, flags())).toBe(true);
    expect(matchesFilter(note(2, "#other"), f, flags())).toBe(false);
  });
});

describe("matchesQuery", () => {
  it("matches title or content case-insensitively, empty matches all", () => {
    const n = note(1, "the BODY text");
    expect(matchesQuery(n, "")).toBe(true);
    expect(matchesQuery(n, "body")).toBe(true);
    expect(matchesQuery(n, "n1")).toBe(true);
    expect(matchesQuery(n, "absent")).toBe(false);
  });
});

describe("filterTitle", () => {
  it("labels each filter type", () => {
    expect(filterTitle({ type: "all" })).toBe("All Notes");
    expect(filterTitle({ type: "trash" })).toBe("Trash");
    expect(filterTitle({ type: "tag", tag: "bear" })).toBe("#bear");
  });
});
