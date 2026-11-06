import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { decode } from "next-auth/jwt";

const { getSession, userFindFirst, userUpdate } = vi.hoisted(() => ({
  getSession: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/prisma", () => ({
  default: { user: { findFirst: userFindFirst, update: userUpdate } },
}));
vi.mock("@/lib/rate-limit", () => ({
  changePasswordLimiter: async () => ({ allowed: true }),
}));

import { createMobileToken, readMobileToken } from "@/lib/mobile-token";
import { sessionStillValid } from "@/lib/session-validity";
import { POST as refresh } from "../auth/mobile/refresh/route";
import { PUT as changePassword } from "../account/password/route";

const USER = { id: "u1", email: "coach@example.com", name: "Casey", role: "COACH" };
let savedSecret: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  savedSecret = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "test-secret";
});

afterEach(() => {
  if (savedSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = savedSecret;
});

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

describe("POST /api/auth/mobile/refresh", () => {
  const signedIn = Date.UTC(2026, 0, 1);

  it("refuses a login that signed in before the password changed", async () => {
    const old = (await createMobileToken(USER, Date.now(), signedIn / 1000))!;
    userFindFirst.mockResolvedValue({ ...USER, sessionsValidAfter: new Date(signedIn + 5000) });
    const res = await refresh(new Request("http://x", { method: "POST", headers: bearer(old.token) }));
    expect(res.status).toBe(401);
  });

  it("refreshes a valid login and keeps its original sign-in time", async () => {
    const current = (await createMobileToken(USER, Date.now(), signedIn / 1000))!;
    userFindFirst.mockResolvedValue({ ...USER, sessionsValidAfter: null });
    const res = await refresh(new Request("http://x", { method: "POST", headers: bearer(current.token) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toEqual(USER);
    expect((await readMobileToken(body.token))?.authTime).toBe(signedIn / 1000);
  });
});

describe("PUT /api/account/password", () => {
  const body = JSON.stringify({ currentPassword: "old-password-1", newPassword: "N3w-password-123" });

  beforeEach(async () => {
    getSession.mockResolvedValue({ user: { id: USER.id, email: USER.email, role: USER.role } });
    userFindFirst.mockResolvedValue({ ...USER, passwordHash: await bcrypt.hash("old-password-1", 4) });
    userUpdate.mockResolvedValue({ id: USER.id });
  });

  const cutoffWritten = () => userUpdate.mock.calls[0][0].data.sessionsValidAfter as Date;

  it("revokes every login and hands a native caller a fresh one", async () => {
    const current = (await createMobileToken(USER))!;
    const req = new Request("http://x", {
      method: "PUT",
      headers: { ...bearer(current.token), "content-type": "application/json" },
      body,
    });
    const res = await changePassword(req);
    expect(res.status).toBe(200);

    const cutoff = cutoffWritten();
    expect(cutoff).toBeInstanceOf(Date);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.session.user).toEqual(USER);
    const fresh = await readMobileToken(data.session.token);
    expect(sessionStillValid(fresh?.authTime, cutoff)).toBe(true);
    // The token the device sent before the change is now dead
    const before = await readMobileToken(current.token);
    expect(sessionStillValid((before?.authTime ?? 0) - 1, cutoff)).toBe(false);
  });

  it("re-mints the web session cookie under the name the browser uses", async () => {
    const req = new Request("http://x", {
      method: "PUT",
      headers: {
        cookie: "__Secure-next-auth.session-token=old; other=1",
        "content-type": "application/json",
      },
      body,
    });
    const res = await changePassword(req);
    expect(res.status).toBe(200);
    expect((await res.json()).session).toBeUndefined();

    const cookie = res.cookies.get("__Secure-next-auth.session-token");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    const claims = await decode({ token: cookie!.value, secret: "test-secret" });
    expect(claims?.userId).toBe(USER.id);
    expect(claims?.role).toBe(USER.role);
    expect(sessionStillValid(claims?.authTime as number, cutoffWritten())).toBe(true);
  });

  it("changes nothing when the current password is wrong", async () => {
    const req = new Request("http://x", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: "nope-nope-1", newPassword: "N3w-password-123" }),
    });
    const res = await changePassword(req);
    expect(res.status).toBe(400);
    expect(userUpdate).not.toHaveBeenCalled();
  });
});
