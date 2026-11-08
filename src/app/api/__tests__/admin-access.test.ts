import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { getSession, userFindUnique, userUpdate, userFindFirst, signupLimiter } = vi.hoisted(
  () => ({
    getSession: vi.fn(),
    userFindUnique: vi.fn(),
    userUpdate: vi.fn(),
    userFindFirst: vi.fn(),
    signupLimiter: vi.fn(),
  })
);

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: userFindUnique, update: userUpdate, findFirst: userFindFirst },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/rate-limit", () => ({ signupLimiter, getClientIp: () => "1.2.3.4" }));
vi.mock("@/lib/push", () => ({ notifyClientJoined: vi.fn() }));

import { POST as resetPassword } from "../admin/users/[id]/password/route";
import { POST as signup } from "../auth/signup/route";

const ENV_KEYS = ["ADMIN_EMAILS", "WAITLIST_ADMIN_TOKEN"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  vi.clearAllMocks();
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.ADMIN_EMAILS = "owner@example.com, second-admin@example.com";
  process.env.WAITLIST_ADMIN_TOKEN = "script-token";
  signupLimiter.mockResolvedValue({ allowed: true });
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/admin/users/[id]/password", () => {
  it("no longer accepts the waitlist script token", async () => {
    getSession.mockResolvedValue(null);
    const req = new Request("http://x", {
      method: "POST",
      headers: { authorization: "Bearer script-token" },
    });
    const res = await resetPassword(req, params("victim"));
    expect(res.status).toBe(401);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("refuses non-admin sessions", async () => {
    getSession.mockResolvedValue({ user: { id: "u1", email: "coach@example.com" } });
    const res = await resetPassword(new Request("http://x", { method: "POST" }), params("victim"));
    expect(res.status).toBe(401);
  });

  it("refuses to reset an admin account", async () => {
    getSession.mockResolvedValue({ user: { id: "u-owner", email: "owner@example.com" } });
    userFindUnique.mockResolvedValue({
      id: "u-admin2",
      email: "second-admin@example.com",
      deletedAt: null,
    });
    const res = await resetPassword(new Request("http://x", { method: "POST" }), params("u-admin2"));
    expect(res.status).toBe(403);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("resets a regular account for an admin session", async () => {
    getSession.mockResolvedValue({ user: { id: "u-owner", email: "owner@example.com" } });
    userFindUnique.mockResolvedValue({ id: "u2", email: "client@example.com", deletedAt: null });
    userUpdate.mockResolvedValue({});
    const res = await resetPassword(new Request("http://x", { method: "POST" }), params("u2"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.tempPassword).toBe("string");
  });
});

describe("POST /api/auth/signup", () => {
  it("refuses an admin-allowlisted email as if it were taken", async () => {
    const req = new Request("http://x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "  Second-Admin@Example.com ",
        password: "a-long-password-123",
        name: "Mallory",
        role: "CLIENT",
      }),
    });
    const res = await signup(req);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("account_exists");
    expect(userFindFirst).not.toHaveBeenCalled();
  });
});
