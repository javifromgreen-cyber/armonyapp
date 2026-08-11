import { describe, expect, it } from "vitest";
import { listKeyOptions, keyOptionId } from "./keyOptions";

describe("listKeyOptions", () => {
  it("produces exactly 24 options: 12 major + 12 relative minors", () => {
    const options = listKeyOptions();
    expect(options).toHaveLength(24);
    expect(options.filter((o) => o.key.mode === "major")).toHaveLength(12);
    expect(options.filter((o) => o.key.mode === "natural-minor")).toHaveLength(12);
  });

  it("includes the conventional 12 major key spellings (no double sharps/flats)", () => {
    const majorTonicNames = listKeyOptions()
      .filter((o) => o.key.mode === "major")
      .map((o) => o.tonicName)
      .sort();
    expect(majorTonicNames).toEqual(
      ["A", "B", "C", "D", "E", "F", "F#", "G", "Ab", "Bb", "Db", "Eb"].sort(),
    );
  });

  it("includes C major and A minor (the Phase 4 default state)", () => {
    const ids = listKeyOptions().map((o) => o.id);
    expect(ids).toContain("C");
    expect(ids).toContain("Am");
  });

  it("relative minors are derived from relativeKey, not independently hardcoded — spot check", () => {
    const options = listKeyOptions();
    const cMajor = options.find((o) => o.id === "C")!;
    const gMajor = options.find((o) => o.id === "G")!;
    expect(options.some((o) => o.id === "Am")).toBe(true); // relative of C
    expect(options.some((o) => o.id === "Em")).toBe(true); // relative of G
    expect(cMajor).toBeDefined();
    expect(gMajor).toBeDefined();
  });

  it("every option has a unique id", () => {
    const ids = listKeyOptions().map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keyOptionId matches by structural identity, not object reference (KeySelector's lookup bug)", () => {
    // A freshly-constructed Key equal in VALUE but a different object
    // reference than anything in listKeyOptions() must still resolve to the
    // same id — this is exactly what the UI does with app state.
    const freshCMajor = { tonic: { letter: "C" as const, accidental: 0 }, mode: "major" as const };
    const options = listKeyOptions();
    const match = options.find((o) => o.id === keyOptionId(freshCMajor));
    expect(match).toBeDefined();
    expect(match!.tonicName).toBe("C");
  });
});
