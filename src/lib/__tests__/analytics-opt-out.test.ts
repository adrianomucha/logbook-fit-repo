import { describe, it, expect } from "vitest";
import {
  ANALYTICS_OPT_OUT_KEY,
  readOptOutIntent,
  stripOptOutParam,
} from "../analytics-opt-out";

const ORIGIN = "https://logbook.fit";

describe("readOptOutIntent", () => {
  it("reads the two documented values", () => {
    expect(readOptOutIntent("?va-disable=1")).toBe("opt-out");
    expect(readOptOutIntent("?va-disable=0")).toBe("opt-in");
  });

  it("works with or without the leading question mark", () => {
    expect(readOptOutIntent("va-disable=1")).toBe("opt-out");
  });

  it("finds the parameter alongside others, in any position", () => {
    expect(readOptOutIntent("?ref=email&va-disable=1")).toBe("opt-out");
    expect(readOptOutIntent("?va-disable=0&ref=email")).toBe("opt-in");
  });

  it("has no opinion when the parameter is absent", () => {
    expect(readOptOutIntent("")).toBeNull();
    expect(readOptOutIntent("?")).toBeNull();
    expect(readOptOutIntent("?ref=email")).toBeNull();
  });

  // Anything that isn't exactly "1" or "0" leaves the stored flag alone rather
  // than guessing. Silently opting a visitor out on a typo is the worse error:
  // it's invisible, and it undercounts real traffic until someone notices.
  it("ignores values it doesn't recognize", () => {
    expect(readOptOutIntent("?va-disable=")).toBeNull();
    expect(readOptOutIntent("?va-disable=true")).toBeNull();
    expect(readOptOutIntent("?va-disable=yes")).toBeNull();
    expect(readOptOutIntent("?va-disable=01")).toBeNull();
    expect(readOptOutIntent("?va-disable")).toBeNull();
  });

  it("does not throw on a malformed query string", () => {
    expect(readOptOutIntent("?%%%&=&va-disable=1")).toBe("opt-out");
  });

  it("takes the first value when the parameter is repeated", () => {
    expect(readOptOutIntent("?va-disable=1&va-disable=0")).toBe("opt-out");
  });
});

describe("stripOptOutParam", () => {
  it("removes the toggle and keeps the path", () => {
    expect(stripOptOutParam(`${ORIGIN}/client/week?va-disable=1`)).toBe("/client/week");
  });

  it("keeps every other parameter", () => {
    expect(stripOptOutParam(`${ORIGIN}/?ref=email&va-disable=1&tab=plans`)).toBe(
      "/?ref=email&tab=plans"
    );
  });

  it("keeps the hash", () => {
    expect(stripOptOutParam(`${ORIGIN}/plans?va-disable=0#week-3`)).toBe("/plans#week-3");
  });

  it("removes every copy when the parameter is repeated", () => {
    expect(stripOptOutParam(`${ORIGIN}/?va-disable=1&va-disable=0`)).toBe("/");
  });

  it("leaves a URL without the toggle alone", () => {
    expect(stripOptOutParam(`${ORIGIN}/coach?tab=clients`)).toBe("/coach?tab=clients");
  });

  it("returns a same-document URL, dropping the origin", () => {
    // Fed straight to history.replaceState, so it must stay relative — an
    // absolute URL would work but would rewrite the origin on preview domains.
    expect(stripOptOutParam(`${ORIGIN}/?va-disable=1`)).toBe("/");
  });
});

describe("ANALYTICS_OPT_OUT_KEY", () => {
  // The key is a published interface: it's what you type into a console, and
  // what the ?va-disable= parameter is named after. Renaming it silently opts
  // every already-excluded browser back in.
  it("is the key Vercel's own docs use", () => {
    expect(ANALYTICS_OPT_OUT_KEY).toBe("va-disable");
  });
});
