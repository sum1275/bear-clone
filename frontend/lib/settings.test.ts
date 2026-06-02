import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, settingsToCssVars } from "@/lib/settings";
import { stripTags, safeFilename } from "@/lib/download";

describe("settingsToCssVars", () => {
  it("maps typography metrics to --doc-* custom properties with units", () => {
    expect(settingsToCssVars(DEFAULT_SETTINGS)).toEqual({
      "--doc-fs": "17.5px",
      "--doc-lh": "1.65",
      "--doc-width": "760px",
      "--doc-pspace": "11px",
      "--doc-pindent": "0em",
    });
  });
  it("reflects changed values", () => {
    const vars = settingsToCssVars({ ...DEFAULT_SETTINGS, fontSize: 22, lineWidth: 900 });
    expect(vars["--doc-fs"]).toBe("22px");
    expect(vars["--doc-width"]).toBe("900px");
  });
});

describe("stripTags", () => {
  it("removes inline #tags including nested ones", () => {
    expect(stripTags("hello #science/wildlife world #bear")).toBe("hello world");
  });
  it("ignores mid-word hashes", () => {
    expect(stripTags("foo#bar baz")).toBe("foo#bar baz");
  });
  it("collapses the gaps it leaves behind", () => {
    expect(stripTags("a #x\n\n\n#y b")).toBe("a\n\nb");
  });
});

describe("safeFilename", () => {
  it("slugifies a title and strips emoji", () => {
    expect(safeFilename("🐻 Field Notes!", "md")).toBe("Field-Notes.md");
  });
  it("falls back to note for empty/punctuation-only titles", () => {
    expect(safeFilename("   ", "md")).toBe("note.md");
  });
});
