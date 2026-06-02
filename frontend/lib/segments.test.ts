import { describe, it, expect } from "vitest";
import { segmentBlocks, findBlock } from "@/lib/segments";

const ranges = (content: string) =>
  segmentBlocks(content).map((b) => [b.start, b.end] as const);

describe("segmentBlocks", () => {
  it("returns one block for an empty note", () => {
    expect(ranges("")).toEqual([[0, 0]]);
  });

  it("keeps single-line constructs one line each", () => {
    // heading, paragraph, blank, bullet, to-do
    expect(ranges("# H\npara\n\n- a\n- [ ] b")).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });

  it("groups a fenced code block (incl. closing fence) into one block", () => {
    expect(ranges("```js\nx\ny\n```\nafter")).toEqual([
      [0, 3],
      [4, 4],
    ]);
  });

  it("handles an unterminated fence by running to EOF", () => {
    expect(ranges("```\nx\ny")).toEqual([[0, 2]]);
  });

  it("groups contiguous ordered-list, blockquote and table runs", () => {
    expect(ranges("1. a\n2. b")).toEqual([[0, 1]]);
    expect(ranges("> q1\n> q2")).toEqual([[0, 1]]);
    expect(ranges("| a | b |\n|---|---|\n| 1 | 2 |")).toEqual([[0, 2]]);
  });

  it("tiles the lines with no gaps", () => {
    const content = "# H\n\n```\nc\n```\n1. a\n1. b\npara";
    const blocks = segmentBlocks(content);
    expect(blocks[0].start).toBe(0);
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].start).toBe(blocks[i - 1].end + 1);
    }
    expect(blocks[blocks.length - 1].end).toBe(content.split("\n").length - 1);
  });
});

describe("findBlock", () => {
  it("locates a block by its start line and reports its index", () => {
    const blocks = segmentBlocks("# H\npara\n- a");
    expect(findBlock(blocks, 1)).toEqual({ block: { start: 1, end: 1 }, index: 1 });
    expect(findBlock(blocks, 5)).toBeNull();
  });
});
