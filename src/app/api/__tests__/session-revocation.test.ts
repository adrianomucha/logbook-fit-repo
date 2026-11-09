import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { decode } from "next-auth/jwt";

const { getSession, userFindFirst, userUpdate, userUpdateMany } = vi.hoisted(() => ({
  getSession: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  userUpdateMany: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/prisma", () => ({
  default: { user: { findFirst: userFindFirst, update: userUpdate, updateMany: userUpdateMany } },
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
  it("refuses a login issued before the password changed", async () => {
    const old = (await createMobileToken(USER, Date.now(), 0))!;
    userFindFirst.mockResolvedValue({ ...USER, sessionVersion: 1 });
    const res = await refresh(new Request("http://x", { method: "POST", headers: bearer(old.token) }));
    expect(res.status).toBe(401);
  });

  it("refreshes a current login at the same version", async () => {
    const current = (await createMobileToken(USER, Date.now(), 4))!;
    userFindFirst.mockResolvedValue({ ...USER, sessionVersion: 4 });
    const res = await refresh(new Request("http://x", { method: "POST", headers: bearer(current.token) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toEqual(USER);
    expect((await readMobileToken(body.token))?.sessionVersion).toBe(4);
  });

  it("notes the account's first sighting in the native app, and only the first", async () => {
    const current = (await createMobileToken(USER, Date.now(), 0))!;
    const call = () =>
      refresh(new Request("http://x", { method: "POST", headers: bearer(current.token) }));

    userFindFirst.mockResolvedValue({ ...USER, sessionVersion: 0, nativeAppFirstSeenAt: null });
    const first = await call();
    expect(userUpdateMany).toHaveBeenCalledTimes(1);
    expect(userUpdateMany.mock.calls[0][0].where).toEqual({ id: USER.id, nativeAppFirstSeenAt: null });
    // Never leaks into the session the app stores
    expect((await first.json()).user).toEqual(USER);

    userFindFirst.mockResolvedValue({ ...USER, sessionVersion: 0, nativeAppFirstSeenAt: new Date() });
    await call();
    expect(userUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("still refreshes when the sighting cannot be written", async () => {
    const current = (await createMobileToken(USER, Date.now(), 0))!;
    userFindFirst.mockResolvedValue({ ...USER, sessionVersion: 0, nativeAppFirstSeenAt: null });
    userUpdateMany.mockRejectedValueOnce(new Error("db down"));
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await refresh(new Request("http://x", { method: "POST", headers: bearer(current.token) }));
    expect(res.status).toBe(200);
    errors.mockRestore();
  });
});

describe("PUT /api/account/password", () => {
  const body = JSON.stringify({ currentPassword: "old-password-1", newPassword: "N3w-password-123" });

  beforeEach(async () => {
    getSession.mockResolvedValue({ user: { id: USER.id, email: USER.email, role: USER.role } });
    userFindFirst.mockResolvedValue({ ...USER, passwordHash: await bcrypt.hash("old-password-1", 4) });
    // The account was at version 0; the change increments it to 1
    userUpdate.mockResolvedValue({ sessionVersion: 1 });
  });

  it("increments the version and hands a native caller a login at the new one", async () => {
    // Signed in moments before the change, at the old version: the case a
    // clock-based cutoff could miss within the same second
    const before = (await createMobileToken(USER, Date.now(), 0))!;
    const req = new Request("http://x", {
      method: "PUT",
      headers: { ...bearer(before.token), "content-type": "application/json" },
      body,
    });
    const res = await changePassword(req);
    expect(res.status).toBe(200);
    expect(userUpdate.mock.calls[0][0].data.sessionVersion).toEqual({ increment: 1 });

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.session.user).toEqual(USER);
    const fresh = await readMobileToken(data.session.token);
    expect(sessionStillValid(fresh?.sessionVersion, 1)).toBe(true);
    // Any login from before the change, however recent, is now dead
    expect(sessionStillValid((await readMobileToken(before.token))?.sessionVersion, 1)).toBe(false);
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
    expect(claims?.sessionVersion).toBe(1);
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
