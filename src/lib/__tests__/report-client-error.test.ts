import { describe, it, expect } from "vitest";
import { scrubReportUrl } from "../report-client-error";

describe("scrubReportUrl", () => {
  it.each([
    ["https://logbook.fit/reset-password?token=abc.def", "https://logbook.fit/reset-password?[redacted]"],
    ["https://logbook.fit/signup?invite=tok123", "https://logbook.fit/signup?[redacted]"],
    ["https://logbook.fit/signup?beta=tok#x", "https://logbook.fit/signup?[redacted]"],
    ["https://logbook.fit/coach/clients/abc#section", "https://logbook.fit/coach/clients/abc"],
    ["https://logbook.fit/", "https://logbook.fit/"],
  ])("keeps the page but not the credentials: %s", (input, expected) => {
    expect(scrubReportUrl(input)).toBe(expected);
  });

  it("drops anything that isn't a URL", () => {
    expect(scrubReportUrl("not a url ?token=abc")).toBeUndefined();
    expect(scrubReportUrl(undefined)).toBeUndefined();
  });
});
