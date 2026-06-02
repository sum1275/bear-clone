import { describe, it, expect } from "vitest";
import { renderMarkdown, extractTags, noteStats, extractToc } from "@/lib/markdown";

describe("renderMarkdown — blocks", () => {
  it("renders headings h1–h3", () => {
    expect(renderMarkdown("# A")).toContain("<h1>A</h1>");
    expect(renderMarkdown("## B")).toContain("<h2>B</h2>");
    expect(renderMarkdown("### C")).toContain("<h3>C</h3>");
  });

  it("renders a paragraph", () => {
    expect(renderMarkdown("hello world")).toBe("<p>hello world</p>");
  });

  it("renders an unordered list", () => {
    const html = renderMarkdown("- a\n- b");
    expect(html).toBe("<ul><li>a</li><li>b</li></ul>");
  });

  it("renders a checklist with done state", () => {
    const html = renderMarkdown("- [x] done\n- [ ] todo");
    expect(html).toContain('class="todo done"');
    expect(html).toContain('class="todo"');
  });

  it("renders fenced code raw (no inline processing) and escapes it", () => {
    const html = renderMarkdown("```js\na < b && *x*\n```");
    expect(html).toContain('<span class="lang">js</span>');
    expect(html).toContain("a &lt; b &amp;&amp; *x*");
    expect(html).not.toContain("<em>");
  });

  it("renders a table with header + body", () => {
    const html = renderMarkdown("| A | B |\n|---|---|\n| 1 | 2 |");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>1</td>");
  });

  it("renders a blockquote", () => {
    expect(renderMarkdown("> quoted")).toBe("<blockquote>quoted</blockquote>");
  });

  it("terminates on a pipe line that is not a real table", () => {
    // A line with pipes but no separator row underneath is not a table. The
    // parser must still make progress and emit it (as a paragraph), not hang.
    const html = renderMarkdown("| just | text |");
    expect(html).toContain("just");
  });
});

describe("renderMarkdown — inline", () => {
  it("escapes HTML in plain text", () => {
    expect(renderMarkdown("a < b > c & d")).toBe("<p>a &lt; b &gt; c &amp; d</p>");
  });

  it("renders bold before italic", () => {
    expect(renderMarkdown("**b** and *i*")).toContain("<strong>b</strong>");
    expect(renderMarkdown("**b** and *i*")).toContain("<em>i</em>");
  });

  it("protects code spans from other inline rules", () => {
    const html = renderMarkdown("`*not italic*`");
    expect(html).toContain('<code class="inline">*not italic*</code>');
    expect(html).not.toContain("<em>");
  });

  it("renders inline #tags but ignores mid-word hashes", () => {
    expect(renderMarkdown("a #bear here")).toContain('<span class="ihash">#bear</span>');
    expect(renderMarkdown("foo#bar")).not.toContain('class="ihash"');
  });

  it("renders wiki and external links", () => {
    expect(renderMarkdown("[[Page]]")).toContain('<a class="wiki">Page</a>');
    expect(renderMarkdown("[t](http://x.com)")).toContain('href="http://x.com"');
  });
});

describe("extractTags", () => {
  it("returns unique tags in first-seen order", () => {
    expect(extractTags("#b text #a and #b again")).toEqual(["b", "a"]);
  });
  it("supports nested tags", () => {
    expect(extractTags("#science/wildlife")).toEqual(["science/wildlife"]);
  });
  it("ignores hashes inside code", () => {
    expect(extractTags("`#nope` and ```\n#alsonope\n``` #yes")).toEqual(["yes"]);
  });
});

describe("noteStats", () => {
  it("counts words, chars, paragraphs and read time", () => {
    const s = noteStats("one two three\n\nsecond para");
    expect(s.words).toBe(5);
    expect(s.paragraphs).toBe(2);
    expect(s.readTime).toBe(1);
  });
  it("is all-zero for empty content", () => {
    expect(noteStats("")).toEqual({ words: 0, chars: 0, paragraphs: 0, readTime: 0 });
  });
});

describe("extractToc", () => {
  it("collects headings with levels", () => {
    expect(extractToc("# A\n## B\ntext\n### C")).toEqual([
      { level: 1, text: "A" },
      { level: 2, text: "B" },
      { level: 3, text: "C" },
    ]);
  });
  it("skips headings inside code fences", () => {
    expect(extractToc("# Real\n```\n# Fake\n```")).toEqual([{ level: 1, text: "Real" }]);
  });
});
