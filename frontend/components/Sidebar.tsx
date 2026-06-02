import { Icon, type IconName } from "@/components/icons";
import type { Filter, FilterType } from "@/lib/view";
import type { TagNode } from "@/lib/tags";

export type ThemeName = "light" | "dark" | "sepia" | "midnight";

const LIBRARY: { type: FilterType; label: string; icon: IconName }[] = [
  { type: "all", label: "All Notes", icon: "doc" },
  { type: "untagged", label: "Untagged", icon: "inbox" },
  { type: "todo", label: "To-Do", icon: "todo" },
  { type: "today", label: "Today", icon: "today" },
  { type: "locked", label: "Locked", icon: "lock" },
  { type: "archive", label: "Archive", icon: "archive" },
  { type: "trash", label: "Trash", icon: "trash" },
];

const THEMES: { name: ThemeName; cls: string }[] = [
  { name: "light", cls: "tdot-light" },
  { name: "dark", cls: "tdot-dark" },
  { name: "sepia", cls: "tdot-sepia" },
  { name: "midnight", cls: "tdot-midnight" },
];

interface SidebarProps {
  filter: Filter;
  onFilter: (f: Filter) => void;
  counts: Record<string, number>;
  tagTree: TagNode[];
  theme: ThemeName;
  onTheme: (t: ThemeName) => void;
}

// One tag row plus its children (recursive). `.srow.child` sets the base indent
// (30px); each nesting level adds 16px so the hierarchy reads visually.
function TagRows({
  nodes,
  filter,
  onFilter,
  depth = 0,
}: {
  nodes: TagNode[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  depth?: number;
}) {
  return (
    <>
      {nodes.map((node) => {
        const sel = filter.type === "tag" && filter.tag === node.name;
        return (
          <div key={node.name}>
            <button
              className={`srow child${sel ? " sel" : ""}`}
              style={depth > 0 ? { paddingLeft: 30 + depth * 16 } : undefined}
              onClick={() => onFilter({ type: "tag", tag: node.name })}
            >
              <span className="tagdot" style={{ background: node.color }} />
              {node.label}
              <span className="count">{node.count}</span>
            </button>
            {node.children.length > 0 && (
              <TagRows
                nodes={node.children}
                filter={filter}
                onFilter={onFilter}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function Sidebar({ filter, onFilter, counts, tagTree, theme, onTheme }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidetop">
        <span className="brand">
          Notes<b>.</b>
        </span>
      </div>

      <div className="sidescroll">
        <div className="dsec">Library</div>
        {LIBRARY.map((row) => {
          const sel = filter.type === row.type;
          const count = counts[row.type] ?? 0;
          return (
            <button
              key={row.type}
              className={`srow${sel ? " sel" : ""}`}
              onClick={() => onFilter({ type: row.type })}
            >
              <Icon name={row.icon} />
              {row.label}
              {count > 0 && <span className="count">{count}</span>}
            </button>
          );
        })}

        {tagTree.length > 0 && (
          <>
            <div className="dsec">Tags</div>
            <TagRows nodes={tagTree} filter={filter} onFilter={onFilter} />
          </>
        )}
      </div>

      <div className="themepick">
        {THEMES.map((t) => (
          <button
            key={t.name}
            className={`themedot ${t.cls}${theme === t.name ? " on" : ""}`}
            onClick={() => onTheme(t.name)}
            aria-label={`${t.name} theme`}
          />
        ))}
      </div>
    </aside>
  );
}
