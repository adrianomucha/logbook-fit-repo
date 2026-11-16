/**
 * What kind of spreadsheet an upload is, decided from its bytes (the
 * filename and Content-Type are client-controlled). The filename's extension
 * only picks between formats that share a container: .xlsx, .ods and
 * .numbers are all zip files.
 */
export interface SpreadsheetType {
  ext: string;
  contentType: string;
}

const ZIP_FORMATS: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  numbers: "application/vnd.apple.numbers",
};

const TEXT_FORMATS: Record<string, string> = {
  csv: "text/csv",
  tsv: "text/tab-separated-values",
};

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

export function detectSpreadsheetType(
  bytes: Uint8Array,
  fileName: string
): SpreadsheetType | null {
  const ext = extensionOf(fileName);

  // Zip container: Excel 2007+, OpenDocument, Numbers
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    return ZIP_FORMATS[ext] ? { ext, contentType: ZIP_FORMATS[ext] } : null;
  }

  // OLE compound file: Excel 97-2003
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return ext === "xls" ? { ext, contentType: "application/vnd.ms-excel" } : null;
  }

  // Plain text: a NUL byte means it's binary, whatever it claims
  if (TEXT_FORMATS[ext] && !bytes.subarray(0, 8192).includes(0)) {
    return { ext, contentType: TEXT_FORMATS[ext] };
  }

  return null;
}

/**
 * The filename as the admin will see it: no path, no control characters,
 * capped in length. Display only; the stored path never uses it.
 */
export function cleanFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (clean || "spreadsheet").slice(-120);
}
