import { describe, it, expect } from "vitest";
import { isFromApp, withFromApp } from "../app-handoff";

describe("withFromApp", () => {
  it("tags a bare URL", () => {
    expect(withFromApp("https://logbook.fit/coach")).toBe("https://logbook.fit/coach?from=app");
  });

  it("keeps an existing query and hash", () => {
    expect(withFromApp("https://logbook.fit/coach?tab=clients#top")).toBe(
      "https://logbook.fit/coach?tab=clients&from=app#top"
    );
  });
});

describe("isFromApp", () => {
  it("reads back what withFromApp wrote", () => {
    expect(isFromApp(new URL(withFromApp("https://logbook.fit/coach")).search)).toBe(true);
    expect(isFromApp("?tab=clients&from=app")).toBe(true);
  });

  it("is false for an ordinary visit", () => {
    expect(isFromApp("")).toBe(false);
    expect(isFromApp("?from=newsletter")).toBe(false);
  });
});
