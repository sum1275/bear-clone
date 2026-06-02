import { describe, it, expect } from "vitest";
import { buildTagTree, tagIcon } from "@/lib/tags";
import type { Note } from "@/lib/notes";

function note(id: number, content: string): Note {
  return {
    id,
    title: `n${id}`,
    content,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("tagIcon", () => {
  it("is deterministic", () => {
    expect(tagIcon("bear")).toBe(tagIcon("bear"));
  });
  it("maps known keywords to intelligent icons", () => {
    expect(tagIcon("travel")).toBe("plane");
    expect(tagIcon("writing")).toBe("feather");
    expect(tagIcon("visa")).toBe("id");
    expect(tagIcon("workshop")).toBe("briefcase");
  });
  it("matches case-insensitively and on substrings", () => {
    expect(tagIcon("Travelling")).toBe("plane");
  });
  it("falls back to a neutral hash for unknown tags", () => {
    expect(tagIcon("qwerty")).toBe("hash");
  });
});

describe("buildTagTree", () => {
  it("nests child tags under their parent", () => {
    const tree = buildTagTree([note(1, "#science/wildlife")]);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("science");
    expect(tree[0].children.map((c) => c.name)).toEqual(["science/wildlife"]);
  });

  it("counts distinct notes, deduped across descendants", () => {
    const tree = buildTagTree([
      note(1, "#science/wildlife #science/climate"),
      note(2, "#science/wildlife"),
    ]);
    const science = tree.find((t) => t.name === "science")!;
    expect(science.count).toBe(2); // two distinct notes, not three tag occurrences
    const wildlife = science.children.find((c) => c.name === "science/wildlife")!;
    expect(wildlife.count).toBe(2);
    const climate = science.children.find((c) => c.name === "science/climate")!;
    expect(climate.count).toBe(1);
  });

  it("sorts alphabetically at each level", () => {
    const tree = buildTagTree([note(1, "#zebra #apple #mango")]);
    expect(tree.map((t) => t.name)).toEqual(["apple", "mango", "zebra"]);
  });

  it("uses the last path segment as the label", () => {
    const tree = buildTagTree([note(1, "#a/b/c")]);
    const leaf = tree[0].children[0].children[0];
    expect(leaf.name).toBe("a/b/c");
    expect(leaf.label).toBe("c");
  });
});
