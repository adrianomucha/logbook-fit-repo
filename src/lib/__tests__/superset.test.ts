import { describe, it, expect } from "vitest";
import { groupBySuperset, isSuperset, exerciseLabel } from "../superset";

const ex = (name: string, superset = false) => ({
  name,
  supersetWithPrevious: superset,
});

describe("groupBySuperset", () => {
  it("returns an empty list for no exercises", () => {
    expect(groupBySuperset([])).toEqual([]);
  });

  it("keeps unchained exercises as standalone groups", () => {
    const groups = groupBySuperset([ex("Squat"), ex("Bench"), ex("Row")]);
    expect(groups.map((g) => g.length)).toEqual([1, 1, 1]);
  });

  it("chains consecutive flagged exercises into one group", () => {
    const groups = groupBySuperset([
      ex("Squat"),
      ex("Bench"),
      ex("Row", true),
      ex("Curl", true),
      ex("Plank"),
    ]);
    expect(groups.map((g) => g.map((e) => e.name))).toEqual([
      ["Squat"],
      ["Bench", "Row", "Curl"],
      ["Plank"],
    ]);
  });

  it("ignores the flag on the first exercise (nothing above to chain to)", () => {
    const groups = groupBySuperset([ex("Squat", true), ex("Bench")]);
    expect(groups.map((g) => g.length)).toEqual([1, 1]);
  });

  it("treats null/undefined flags as unchained", () => {
    const groups = groupBySuperset([
      { name: "Squat", supersetWithPrevious: null },
      { name: "Bench" },
    ]);
    expect(groups.map((g) => g.length)).toEqual([1, 1]);
  });

  it("preserves every exercise exactly once, in order", () => {
    const input = [ex("A"), ex("B", true), ex("C"), ex("D", true), ex("E", true)];
    const flattened = groupBySuperset(input).flat();
    expect(flattened).toEqual(input);
  });
});

describe("isSuperset", () => {
  it("is true only for groups with 2+ members", () => {
    expect(isSuperset([ex("A")])).toBe(false);
    expect(isSuperset([ex("A"), ex("B", true)])).toBe(true);
  });
});

describe("exerciseLabel", () => {
  it("uses the plain number for standalone exercises", () => {
    expect(exerciseLabel(3, 0, 1)).toBe("3");
  });

  it("appends letters for superset members", () => {
    expect(exerciseLabel(4, 0, 2)).toBe("4A");
    expect(exerciseLabel(4, 1, 2)).toBe("4B");
    expect(exerciseLabel(4, 2, 3)).toBe("4C");
  });
});
