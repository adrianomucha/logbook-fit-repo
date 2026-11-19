import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const m = vi.hoisted(() => ({
  getSession: vi.fn(),
  count: vi.fn(),
  batch: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: m.getSession }));
vi.mock("@/lib/setup-call-nudge", () => ({
  countBacklogNudges: m.count,
  sendBacklogNudgeBatch: m.batch,
}));

import { GET, POST } from "../admin/waitlist/backlog-nudge/route";

const asAdmin = () => m.getSession.mockResolvedValue({ user: { email: "owner@logbook.fit" } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ADMIN_EMAILS", "owner@logbook.fit");
  vi.stubEnv("NEXT_PUBLIC_CAL_SETUP_CALL_LINK", "adrian-logbook.fit/setup-call");
});

afterEach(() => vi.unstubAllEnvs());

describe("/api/admin/waitlist/backlog-nudge", () => {
  it("refuses anyone who isn't an admin, without sending", async () => {
    m.getSession.mockResolvedValue({ user: { email: "coach@example.com" } });
    expect((await GET(new Request("http://x/api/admin/waitlist/backlog-nudge"))).status).toBe(401);
    expect((await POST()).status).toBe(401);
    expect(m.batch).not.toHaveBeenCalled();
  });

  it("reports how many it would reach", async () => {
    asAdmin();
    m.count.mockResolvedValue(23);
    const res = await GET(new Request("http://x/api/admin/waitlist/backlog-nudge"));
    expect(await res.json()).toEqual({ configured: true, count: 23 });
  });

  it("previews the backlog email as HTML", async () => {
    asAdmin();
    const res = await GET(new Request("http://x/api/admin/waitlist/backlog-nudge?preview=1"));
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("You can skip the Logbook.fit waitlist now");
    expect(html).toContain("https://cal.com/adrian-logbook.fit/setup-call?email=coach%40example.com");
  });

  it("sends one batch and says how many are left", async () => {
    asAdmin();
    m.batch.mockResolvedValue({ candidates: 40, sent: 40, failures: 0, remaining: 12 });
    const res = await POST();
    expect(await res.json()).toEqual({ candidates: 40, sent: 40, failures: 0, remaining: 12 });
  });

  it("won't send without a booking link", async () => {
    asAdmin();
    vi.stubEnv("NEXT_PUBLIC_CAL_SETUP_CALL_LINK", "");
    expect((await POST()).status).toBe(409);
    expect(m.batch).not.toHaveBeenCalled();
  });
});
