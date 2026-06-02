import type { Note } from "@/lib/notes";
import { extractTags } from "@/lib/markdown";

// Palette taken from the design prototype's tag dots.
const TAG_PALETTE = [
  "#e2493d", // red
  "#5b8def", // blue
  "#7d8cff", // indigo
  "#14a06a", // green
  "#c97f2f", // amber
  "#c2552f", // rust
  "#8a5bef", // violet
  "#2f9ec9", // cyan
];

// Deterministic color for a tag name — same name always maps to the same swatch.
export function tagColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}

export interface TagNode {
  name: string; // full path, e.g. "science/wildlife"
  label: string; // last path segment, shown in the sidebar row
  count: number; // distinct notes under this tag (descendants included)
  color: string;
  children: TagNode[];
}

// Build the nested tag tree for the sidebar from all notes' #tags.
// Nested tags use "/" (e.g. "science/wildlife" nests under "science"), and a
// parent's count includes every note tagged with it OR any descendant.
export function buildTagTree(notes: Note[]): TagNode[] {
  // path -> set of note ids that touch this path (ancestors included)
  const counts = new Map<string, Set<number>>();

  const add = (path: string, id: number) => {
    let set = counts.get(path);
    if (!set) {
      set = new Set();
      counts.set(path, set);
    }
    set.add(id);
  };

  for (const note of notes) {
    for (const tag of extractTags(note.content)) {
      const segments = tag.split("/").filter(Boolean);
      let prefix = "";
      for (const seg of segments) {
        prefix = prefix ? `${prefix}/${seg}` : seg;
        add(prefix, note.id); // count toward this path and every ancestor
      }
    }
  }

  // Create a node for every path...
  const nodes = new Map<string, TagNode>();
  for (const [path, ids] of counts) {
    nodes.set(path, {
      name: path,
      label: path.slice(path.lastIndexOf("/") + 1),
      count: ids.size,
      color: tagColor(path),
      children: [],
    });
  }

  // ...then link children to parents (every ancestor path has a node).
  const roots: TagNode[] = [];
  for (const [path, node] of nodes) {
    const idx = path.lastIndexOf("/");
    if (idx === -1) {
      roots.push(node);
    } else {
      const parent = nodes.get(path.slice(0, idx));
      if (parent) parent.children.push(node);
      else roots.push(node); // safety: shouldn't happen
    }
  }

  // Alphabetical at each level.
  const sortRec = (list: TagNode[]) => {
    list.sort((a, b) => a.label.localeCompare(b.label));
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);

  return roots;
}
