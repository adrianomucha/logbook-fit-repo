/**
 * Pure data layer for the group-finder bots: candidate schema, URL
 * normalisation, dedup/merge and CSV export. No I/O, no network — this is
 * what the unit tests cover.
 */
import { z } from "zod";

export const PRIVACY = ["public", "private", "unknown"] as const;
export type Privacy = (typeof PRIVACY)[number];
export const CONFIDENCE = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

const nullableString = z.string().nullable().optional();
const nullableInt = z
  .number()
  .nullable()
  .optional()
  .transform((n) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n) : null));

/** One group as Grok reports it. Lenient on purpose: bad fields degrade, not crash. */
export const CandidateSchema = z.object({
  name: z.string().min(1),
  url: nullableString,
  privacy: z.enum(PRIVACY).catch("unknown"),
  members_estimate: nullableInt,
  region: nullableString,
  audience: nullableString,
  fit_score: z.number().catch(0).transform((n) => Math.min(5, Math.max(0, Math.round(n)))),
  fit_rationale: nullableString,
  promo_policy: nullableString,
  activity_signal: nullableString,
  sources: z.array(z.string()).catch([]),
  confidence: z.enum(CONFIDENCE).catch("low"),
});
export type Candidate = z.infer<typeof CandidateSchema>;

/** One verifier result for a candidate URL. */
export const VerificationSchema = z.object({
  url: z.string(),
  exists: z.boolean().catch(false),
  name: nullableString,
  members_estimate: nullableInt,
  privacy: z.enum(PRIVACY).catch("unknown"),
  us_based: z.boolean().nullable().optional(),
  audience: nullableString,
  promo_policy: nullableString,
  activity_signal: nullableString,
  notes: nullableString,
  sources: z.array(z.string()).catch([]),
});
export type Verification = z.infer<typeof VerificationSchema>;

/** What we persist in out/groups.json — one row per unique group. */
export interface GroupRecord {
  key: string;
  name: string;
  url: string | null;
  privacy: Privacy;
  members_estimate: number | null;
  region: string | null;
  audience: string | null;
  fit_score: number;
  fit_rationale: string | null;
  promo_policy: string | null;
  activity_signal: string | null;
  confidence: Confidence;
  sources: string[];
  bots: string[];
  queries: string[];
  /** null = not checked yet; true/false = verifier bot's verdict. */
  verified: boolean | null;
  verify_notes: string | null;
  first_seen: string;
  last_seen: string;
}

const FB_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "mobile.facebook.com", "web.facebook.com", "fb.com", "www.fb.com"]);

/**
 * Canonical form of a Facebook *group* URL, or null if the URL isn't one.
 * `https://m.facebook.com/groups/PTBiz/about?ref=share` → `https://www.facebook.com/groups/ptbiz`
 */
export function normalizeFacebookGroupUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!FB_HOSTS.has(u.hostname.toLowerCase())) return null;
  const m = u.pathname.match(/^\/groups\/([^/?#]+)/i);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]).toLowerCase();
  if (!slug || slug === "search" || slug === "discover" || slug === "feed") return null;
  return `https://www.facebook.com/groups/${slug}`;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‘’“”]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function groupKey(c: { name: string; url?: string | null }): string {
  const url = normalizeFacebookGroupUrl(c.url);
  return url ? `url:${url}` : `name:${normalizeName(c.name)}`;
}

/**
 * Pull a JSON array (or an object wrapping one) out of model output that may
 * contain prose or ```json fences. Returns [] when nothing parses.
 */
export function extractJsonArray(text: string): unknown[] {
  if (!text) return [];
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const candidates: string[] = [stripped];
  const a = stripped.indexOf("[");
  const b = stripped.lastIndexOf("]");
  if (a !== -1 && b > a) candidates.push(stripped.slice(a, b + 1));
  const oa = stripped.indexOf("{");
  const ob = stripped.lastIndexOf("}");
  if (oa !== -1 && ob > oa) candidates.push(stripped.slice(oa, ob + 1));
  for (const s of candidates) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") {
        for (const k of ["groups", "results", "items", "data"]) {
          if (Array.isArray((parsed as any)[k])) return (parsed as any)[k];
        }
      }
    } catch {
      /* try next slice */
    }
  }
  return [];
}

/** Parse + validate a model response into candidates, dropping malformed rows. */
export function parseCandidates(text: string): { candidates: Candidate[]; dropped: number } {
  const rows = extractJsonArray(text);
  const candidates: Candidate[] = [];
  let dropped = 0;
  for (const row of rows) {
    const r = CandidateSchema.safeParse(row);
    if (r.success) candidates.push(r.data);
    else dropped++;
  }
  return { candidates, dropped };
}

export function parseVerifications(text: string): Verification[] {
  const out: Verification[] = [];
  for (const row of extractJsonArray(text)) {
    const r = VerificationSchema.safeParse(row);
    if (r.success) out.push(r.data);
  }
  return out;
}

export interface Sighting {
  candidate: Candidate;
  bot: string;
  query: string;
  /** Extra source URLs from the response (citations) to attach. */
  citations?: string[];
}

const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))];
const pick = <T>(a: T | null | undefined, b: T | null | undefined): T | null => (a ?? b ?? null);

/**
 * Merge new sightings into the existing list. Dedup key is the canonical
 * group URL, falling back to the normalised name. Existing rows keep their
 * first_seen and verification; fields fill in from the newest sighting when
 * the old value was empty; fit_score keeps the max.
 */
export function mergeSightings(existing: GroupRecord[], sightings: Sighting[], now: string): GroupRecord[] {
  const byKey = new Map<string, GroupRecord>(existing.map((g) => [g.key, g]));
  for (const s of sightings) {
    const c = s.candidate;
    const url = normalizeFacebookGroupUrl(c.url);
    const key = groupKey(c);
    // Exact key first; otherwise a row we only know by name (no URL yet).
    const prev = byKey.get(key) ?? findUnlinkedByName(byKey, c.name);
    const sources = uniq([...c.sources, ...(s.citations ?? [])]);
    if (!prev) {
      byKey.set(key, {
        key,
        name: c.name.trim(),
        url,
        privacy: c.privacy,
        members_estimate: c.members_estimate ?? null,
        region: c.region ?? null,
        audience: c.audience ?? null,
        fit_score: c.fit_score,
        fit_rationale: c.fit_rationale ?? null,
        promo_policy: c.promo_policy ?? null,
        activity_signal: c.activity_signal ?? null,
        confidence: c.confidence,
        sources,
        bots: [s.bot],
        queries: [s.query],
        verified: null,
        verify_notes: null,
        first_seen: now,
        last_seen: now,
      });
      continue;
    }
    // A name-keyed row that now has a URL: re-key it so future sightings dedup by URL.
    if (!prev.url && url) {
      byKey.delete(prev.key);
      prev.key = key;
      prev.url = url;
      byKey.set(key, prev);
    }
    prev.privacy = prev.privacy === "unknown" ? c.privacy : prev.privacy;
    prev.members_estimate = pick(prev.members_estimate, c.members_estimate);
    prev.region = pick(prev.region, c.region);
    prev.audience = pick(prev.audience, c.audience);
    if (c.fit_score > prev.fit_score) {
      prev.fit_score = c.fit_score;
      prev.fit_rationale = c.fit_rationale ?? prev.fit_rationale;
    }
    prev.promo_policy = pick(prev.promo_policy, c.promo_policy);
    prev.activity_signal = pick(prev.activity_signal, c.activity_signal);
    if (rank(c.confidence) > rank(prev.confidence)) prev.confidence = c.confidence;
    prev.sources = uniq([...prev.sources, ...sources]);
    prev.bots = uniq([...prev.bots, s.bot]);
    prev.queries = uniq([...prev.queries, s.query]);
    prev.last_seen = now;
  }
  return sortGroups([...byKey.values()]);
}

function findUnlinkedByName(byKey: Map<string, GroupRecord>, name: string): GroupRecord | undefined {
  const n = normalizeName(name);
  for (const g of byKey.values()) if (!g.url && normalizeName(g.name) === n) return g;
  return undefined;
}

const rank = (c: Confidence) => ({ low: 0, medium: 1, high: 2 })[c];

/** Apply verifier verdicts. A group the verifier says doesn't exist is kept but flagged. */
export function applyVerifications(groups: GroupRecord[], verdicts: Verification[], now: string): GroupRecord[] {
  const byUrl = new Map(verdicts.map((v) => [normalizeFacebookGroupUrl(v.url) ?? v.url, v]));
  for (const g of groups) {
    if (!g.url) continue;
    const v = byUrl.get(g.url);
    if (!v) continue;
    g.verified = v.exists && v.us_based !== false;
    g.verify_notes = [v.exists ? null : "not found", v.us_based === false ? "not US" : null, v.notes]
      .filter(Boolean)
      .join("; ") || null;
    if (v.exists) {
      if (v.name) g.name = v.name;
      g.members_estimate = v.members_estimate ?? g.members_estimate;
      if (v.privacy !== "unknown") g.privacy = v.privacy;
      g.audience = v.audience ?? g.audience;
      g.promo_policy = v.promo_policy ?? g.promo_policy;
      g.activity_signal = v.activity_signal ?? g.activity_signal;
      g.sources = uniq([...g.sources, ...v.sources]);
      g.confidence = "high";
    }
    g.last_seen = now;
  }
  return sortGroups(groups);
}

/** Verified first, then fit, then size. Unverified-false sinks to the bottom. */
export function sortGroups(groups: GroupRecord[]): GroupRecord[] {
  return [...groups].sort((a, b) => {
    const va = a.verified === false ? -1 : a.verified === true ? 1 : 0;
    const vb = b.verified === false ? -1 : b.verified === true ? 1 : 0;
    if (va !== vb) return vb - va;
    if (a.fit_score !== b.fit_score) return b.fit_score - a.fit_score;
    return (b.members_estimate ?? 0) - (a.members_estimate ?? 0);
  });
}

export const CSV_COLUMNS: (keyof GroupRecord)[] = [
  "name",
  "url",
  "fit_score",
  "verified",
  "privacy",
  "members_estimate",
  "region",
  "audience",
  "promo_policy",
  "activity_signal",
  "confidence",
  "fit_rationale",
  "verify_notes",
  "bots",
  "sources",
  "first_seen",
  "last_seen",
];

export function toCsv(groups: GroupRecord[]): string {
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join(" | ") : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [CSV_COLUMNS.join(",")];
  for (const g of groups) lines.push(CSV_COLUMNS.map((c) => esc(g[c])).join(","));
  return lines.join("\n") + "\n";
}
