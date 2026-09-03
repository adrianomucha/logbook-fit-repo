import { describe, expect, it } from "vitest";
import {
  applyVerifications,
  extractJsonArray,
  groupKey,
  mergeSightings,
  normalizeFacebookGroupUrl,
  parseCandidates,
  toCsv,
  type Candidate,
  type GroupRecord,
} from "./groups";

const NOW = "2026-09-03T00:00:00.000Z";
const LATER = "2026-09-04T00:00:00.000Z";

const candidate = (over: Partial<Candidate> = {}): Candidate => ({
  name: "Personal Trainer Business Owners",
  url: "https://www.facebook.com/groups/ptbizowners",
  privacy: "private",
  members_estimate: 12000,
  region: "US (nationwide)",
  audience: "independent PTs",
  fit_score: 5,
  fit_rationale: "coaches talking business",
  promo_policy: null,
  activity_signal: null,
  sources: ["https://example.com/roundup"],
  confidence: "high",
  ...over,
});

describe("normalizeFacebookGroupUrl", () => {
  it("canonicalises mobile/desktop variants, paths and query strings", () => {
    for (const u of [
      "https://www.facebook.com/groups/PTBizOwners/",
      "https://m.facebook.com/groups/ptbizowners/about?ref=share",
      "facebook.com/groups/PTBIZOWNERS/posts/123",
      "http://web.facebook.com/groups/ptbizowners",
    ]) {
      expect(normalizeFacebookGroupUrl(u)).toBe("https://www.facebook.com/groups/ptbizowners");
    }
  });

  it("keeps numeric group ids", () => {
    expect(normalizeFacebookGroupUrl("https://www.facebook.com/groups/123456789012345")).toBe(
      "https://www.facebook.com/groups/123456789012345",
    );
  });

  it("rejects non-group and non-facebook urls", () => {
    expect(normalizeFacebookGroupUrl("https://www.facebook.com/SomeBusinessPage")).toBeNull();
    expect(normalizeFacebookGroupUrl("https://www.facebook.com/groups/search?q=trainers")).toBeNull();
    expect(normalizeFacebookGroupUrl("https://www.instagram.com/groups/x")).toBeNull();
    expect(normalizeFacebookGroupUrl("not a url at all ://")).toBeNull();
    expect(normalizeFacebookGroupUrl(null)).toBeNull();
  });
});

describe("groupKey", () => {
  it("keys by url when present, otherwise by normalised name", () => {
    expect(groupKey({ name: "X", url: "https://m.facebook.com/groups/Abc/" })).toBe("url:https://www.facebook.com/groups/abc");
    expect(groupKey({ name: "  PT & Coach   Network!! ", url: null })).toBe("name:pt and coach network");
  });
});

describe("extractJsonArray / parseCandidates", () => {
  it("parses fenced json and json embedded in prose", () => {
    const fenced = "Here you go:\n```json\n[{\"name\":\"A\",\"fit_score\":4}]\n```";
    expect(extractJsonArray(fenced)).toEqual([{ name: "A", fit_score: 4 }]);
    const wrapped = '{"groups":[{"name":"B","fit_score":3}]}';
    expect(extractJsonArray(wrapped)).toEqual([{ name: "B", fit_score: 3 }]);
    expect(extractJsonArray("no json here")).toEqual([]);
  });

  it("keeps valid rows, coerces sloppy fields, drops rows without a name", () => {
    const text = JSON.stringify([
      { name: "Good", url: null, privacy: "PRIVATE?", members_estimate: 1500.7, fit_score: 4.4, confidence: "very high", sources: "nope" },
      { url: "https://www.facebook.com/groups/noname", fit_score: 5 },
    ]);
    const { candidates, dropped } = parseCandidates(text);
    expect(dropped).toBe(1);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ name: "Good", privacy: "unknown", members_estimate: 1501, fit_score: 4, confidence: "low", sources: [] });
  });
});

describe("mergeSightings", () => {
  it("dedups by canonical url across bots and unions provenance", () => {
    const first = mergeSightings([], [{ candidate: candidate(), bot: "pt-independent", query: "q1" }], NOW);
    const second = mergeSightings(
      first,
      [
        {
          candidate: candidate({ url: "https://m.facebook.com/groups/PTBizOwners/about", fit_score: 3, members_estimate: null, promo_policy: "promo Fridays", sources: ["https://example.com/other"] }),
          bot: "online-coaching",
          query: "q2",
          citations: ["https://cite.example"],
        },
      ],
      LATER,
    );
    expect(second).toHaveLength(1);
    const g = second[0];
    expect(g.url).toBe("https://www.facebook.com/groups/ptbizowners");
    expect(g.fit_score).toBe(5); // keeps max
    expect(g.members_estimate).toBe(12000); // keeps known value
    expect(g.promo_policy).toBe("promo Fridays"); // fills in empty
    expect(g.bots).toEqual(["pt-independent", "online-coaching"]);
    expect(g.queries).toEqual(["q1", "q2"]);
    expect(g.sources).toEqual(["https://example.com/roundup", "https://example.com/other", "https://cite.example"]);
    expect(g.first_seen).toBe(NOW);
    expect(g.last_seen).toBe(LATER);
  });

  it("upgrades a name-only row to a url-keyed row when a later sighting has the url", () => {
    const first = mergeSightings([], [{ candidate: candidate({ url: null }), bot: "a", query: "q" }], NOW);
    expect(first[0].key).toBe("name:personal trainer business owners");
    const second = mergeSightings(first, [{ candidate: candidate({ name: "Personal Trainer Business Owners!" }), bot: "b", query: "q" }], LATER);
    expect(second).toHaveLength(1);
    expect(second[0].key).toBe("url:https://www.facebook.com/groups/ptbizowners");
    expect(second[0].url).toBe("https://www.facebook.com/groups/ptbizowners");
  });

  it("sorts by fit then size", () => {
    const groups = mergeSightings(
      [],
      [
        { candidate: candidate({ name: "Small 5", url: "https://facebook.com/groups/s5", members_estimate: 100 }), bot: "a", query: "q" },
        { candidate: candidate({ name: "Big 4", url: "https://facebook.com/groups/b4", fit_score: 4, members_estimate: 50000 }), bot: "a", query: "q" },
        { candidate: candidate({ name: "Big 5", url: "https://facebook.com/groups/b5", members_estimate: 9000 }), bot: "a", query: "q" },
      ],
      NOW,
    );
    expect(groups.map((g) => g.name)).toEqual(["Big 5", "Small 5", "Big 4"]);
  });
});

describe("applyVerifications", () => {
  it("marks verified groups, refreshes facts, and sinks rejected ones", () => {
    const groups = mergeSightings(
      [],
      [
        { candidate: candidate({ name: "Real", url: "https://facebook.com/groups/real", fit_score: 3 }), bot: "a", query: "q" },
        { candidate: candidate({ name: "Fake", url: "https://facebook.com/groups/fake", fit_score: 5 }), bot: "a", query: "q" },
        { candidate: candidate({ name: "Unchecked", url: "https://facebook.com/groups/unchecked", fit_score: 4 }), bot: "a", query: "q" },
      ],
      NOW,
    );
    const out = applyVerifications(
      groups,
      [
        { url: "https://m.facebook.com/groups/real/", exists: true, name: "Real Coaches Group", members_estimate: 20000, privacy: "public", us_based: true, audience: null, promo_policy: null, activity_signal: null, notes: "looks active", sources: ["https://facebook.com/groups/real"] },
        { url: "https://facebook.com/groups/fake", exists: false, name: null, members_estimate: null, privacy: "unknown", us_based: null, audience: null, promo_policy: null, activity_signal: null, notes: "404", sources: [] },
      ],
      LATER,
    );
    expect(out.map((g) => g.name)).toEqual(["Real Coaches Group", "Unchecked", "Fake"]);
    const real = out[0];
    expect(real.verified).toBe(true);
    expect(real.members_estimate).toBe(20000);
    expect(real.privacy).toBe("public");
    expect(real.confidence).toBe("high");
    expect(out[1].verified).toBeNull();
    expect(out[2].verified).toBe(false);
    expect(out[2].verify_notes).toBe("not found; 404");
  });
});

describe("toCsv", () => {
  it("escapes commas, quotes and newlines and joins arrays", () => {
    const g: GroupRecord = {
      key: "k",
      name: 'Coaches, "Inc"',
      url: "https://www.facebook.com/groups/x",
      privacy: "public",
      members_estimate: 10,
      region: "US",
      audience: "line1\nline2",
      fit_score: 5,
      fit_rationale: null,
      promo_policy: null,
      activity_signal: null,
      confidence: "high",
      sources: ["a", "b"],
      bots: ["x"],
      queries: ["q"],
      verified: true,
      verify_notes: null,
      first_seen: NOW,
      last_seen: NOW,
    };
    const csv = toCsv([g]);
    expect(csv.startsWith("name,url,fit_score,verified")).toBe(true);
    expect(csv).toContain('"Coaches, ""Inc"""');
    expect(csv).toContain('"line1\nline2"');
    expect(csv).toContain("a | b");
    expect(csv.split("\n")).toHaveLength(4); // header + a row spanning 2 physical lines + trailing newline
  });
});
