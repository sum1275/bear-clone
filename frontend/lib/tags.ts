import type { Note } from "@/lib/notes";
import { extractTags } from "@/lib/markdown";

// Bear assigns each tag a monochrome icon based on its name (no colors). We do
// the same with a keyword map: the first rule whose pattern matches the tag
// wins; anything unmatched falls back to a neutral hash. Matching is done on
// the whole lowercased path so "work/visa" still resolves "visa".
const TAG_ICON_RULES: [RegExp, string][] = [
  [/travel|trip|flight|vacation|holiday|tour|journey/, "plane"],
  [/visa|passport|immigration|id\b|licen[sc]e/, "id"],
  [/work|workshop|job|office|career|client|biz|business|meeting/, "briefcase"],
  [/writ|blog|journal|essay|draft|poem|story|novel/, "feather"],
  [/read|book|reading|library|study|school|learn|course|class|lecture/, "book"],
  [/code|coding|dev|program|software|engineer|tech|api|bug/, "code"],
  [/idea|brainstorm|think|concept|inspiration/, "bulb"],
  [/money|finance|budget|expense|invoice|tax|bank|salary|invest/, "money"],
  [/gym|fitness|workout|exercise|run|train|sport/, "dumbbell"],
  [/health|medical|doctor|clinic|wellness|therapy/, "heart"],
  [/love|relationship|family|friend|date/, "heart"],
  [/food|recipe|cook|meal|eat|kitchen|coffee|cafe|restaurant/, "coffee"],
  [/music|song|playlist|album|band|guitar/, "music"],
  [/photo|camera|picture|image|shot/, "camera"],
  [/film|movie|video|cinema|watch|series|show/, "film"],
  [/home|house|apartment|rent|chore/, "home"],
  [/shop|buy|purchase|store|cart|grocery|wishlist/, "cart"],
  [/science|research|lab|wildlife|nature|animal|bear|plant|garden|eco/, "leaf"],
  [/game|gaming|play|hobby/, "game"],
  [/mail|email|message|inbox|newsletter/, "mail"],
  [/map|location|place|geo|city|direction/, "map"],
  [/world|global|earth|country|language|culture/, "globe"],
  [/star|favorite|favourite|important|priority|highlight/, "star"],
  [/flag|goal|milestone|target/, "flag"],
  [/project|folder|archive|collection/, "folder"],
];

// Deterministic monochrome icon for a tag name — same name always maps to the
// same glyph. Bear-style: intelligent keyword match, neutral hash otherwise.
export function tagIcon(name: string): string {
  const key = name.toLowerCase();
  for (const [pattern, icon] of TAG_ICON_RULES) {
    if (pattern.test(key)) return icon;
  }
  return "hash";
}

export interface TagNode {
  name: string; // full path, e.g. "science/wildlife"
  label: string; // last path segment, shown in the sidebar row
  count: number; // distinct notes under this tag (descendants included)
  icon: string; // auto-assigned monochrome icon
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
    const label = path.slice(path.lastIndexOf("/") + 1);
    nodes.set(path, {
      name: path,
      label,
      count: ids.size,
      icon: tagIcon(label), // match the most specific segment, e.g. work/visa → visa
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
