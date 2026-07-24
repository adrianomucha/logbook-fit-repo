import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

// The auth module pulls in the DB client and the Upstash-backed limiter purely
// for the credentials provider; neither is exercised by the callbacks here.
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/rate-limit", () => ({ loginLimiter: vi.fn() }));

import { authOptions } from "../auth";

const jwtCallback = authOptions.callbacks!.jwt!;
const sessionCallback = authOptions.callbacks!.session!;

/** Invoke the jwt callback with only the fields the admin claim depends on. */
function runJwt(token: JWT, user?: { email?: string | null }) {
  return jwtCallback({ token, user } as unknown as Parameters<typeof jwtCallback>[0]);
}

/** Invoke the session callback with a minimal session/token pair. */
async function runSession(token: JWT): Promise<{ user: { isAdmin?: boolean } }> {
  const session = { user: {} } as unknown as Session;
  const result = await sessionCallback({
    session,
    token,
  } as unknown as Parameters<typeof sessionCallback>[0]);
  return result as unknown as { user: { isAdmin?: boolean } };
}

let savedAdminEmails: string | undefined;

beforeEach(() => {
  savedAdminEmails = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "owner@example.com";
});

afterEach(() => {
  if (savedAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = savedAdminEmails;
});

describe("jwt callback — isAdmin claim", () => {
  it("sets isAdmin at sign-in for an allowlisted email", async () => {
    const token = await runJwt({} as JWT, { email: "owner@example.com" });
    expect(token.isAdmin).toBe(true);
  });

  it("leaves isAdmin false for a coach who just signed up", async () => {
    const token = await runJwt({} as JWT, { email: "coach@example.com" });
    expect(token.isAdmin).toBe(false);
  });

  it("recomputes from the token email on later requests, not just at sign-in", async () => {
    const token = await runJwt({ email: "owner@example.com" } as JWT);
    expect(token.isAdmin).toBe(true);
  });

  it("revokes a stale claim once the email leaves the allowlist", async () => {
    process.env.ADMIN_EMAILS = "someone-else@example.com";
    const token = await runJwt({ email: "owner@example.com", isAdmin: true } as JWT);
    expect(token.isAdmin).toBe(false);
  });

  it("ignores an isAdmin value forged into the token", async () => {
    const token = await runJwt({ email: "coach@example.com", isAdmin: true } as JWT);
    expect(token.isAdmin).toBe(false);
  });
});

describe("session callback — isAdmin exposure", () => {
  it("exposes the claim to the client", async () => {
    const session = await runSession({ isAdmin: true } as JWT);
    expect(session.user.isAdmin).toBe(true);
  });

  it("defaults to false when the claim is absent", async () => {
    const session = await runSession({} as JWT);
    expect(session.user.isAdmin).toBe(false);
  });
});
