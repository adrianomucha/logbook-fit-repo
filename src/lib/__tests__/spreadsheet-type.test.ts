import { describe, it, expect } from "vitest";
import { cleanFileName, detectSpreadsheetType } from "@/lib/spreadsheet-type";

const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]);
const csv = new TextEncoder().encode("Exercise,Sets,Reps\nSquat,3,5\n");

describe("detectSpreadsheetType", () => {
  it("tells zip-based formats apart by extension", () => {
    expect(detectSpreadsheetType(zip, "Program.XLSX")?.ext).toBe("xlsx");
    expect(detectSpreadsheetType(zip, "program.ods")?.ext).toBe("ods");
    expect(detectSpreadsheetType(zip, "program.numbers")?.ext).toBe("numbers");
  });

  it("refuses a zip that isn't a spreadsheet", () => {
    expect(detectSpreadsheetType(zip, "photos.zip")).toBeNull();
    expect(detectSpreadsheetType(zip, "report.docx")).toBeNull();
  });

  it("reads old Excel files and plain CSV", () => {
    expect(detectSpreadsheetType(ole, "old.xls")?.ext).toBe("xls");
    expect(detectSpreadsheetType(csv, "block.csv")?.contentType).toBe("text/csv");
  });

  it("refuses binary dressed up as CSV, and anything else", () => {
    expect(detectSpreadsheetType(ole, "fake.csv")).toBeNull();
    expect(detectSpreadsheetType(csv, "program.pdf")).toBeNull();
    expect(detectSpreadsheetType(new TextEncoder().encode("%PDF-1.7"), "a.xlsx")).toBeNull();
  });
});

describe("cleanFileName", () => {
  it("drops paths and control characters", () => {
    expect(cleanFileName("C:\\Users\\sam\\Block 1.xlsx")).toBe("Block 1.xlsx");
    expect(cleanFileName("../../etc/passwd")).toBe("passwd");
    expect(cleanFileName("a\u0000b\nc.csv")).toBe("abc.csv");
    expect(cleanFileName("")).toBe("spreadsheet");
  });
});
