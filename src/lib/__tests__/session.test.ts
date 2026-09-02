import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// sessionFromBearer is pure over the token; keep prisma and next/headers out
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next-auth", () => ({ getServerSession: async () => null }));

import { createMobileToken } from "../mobile-token";
import { sessionFromBearer } from "../session";

let savedSecret: string | undefined;

beforeEach(() => {
  savedSecret = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "test-secret";
});

afterEach(() => {
  if (savedSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = savedSecret;
});

describe("sessionFromBearer", () => {
  it("yields a Session shaped exactly like the cookie one", async () => {
    const minted = (await createMobileToken({
      id: "u1",
      email: "coach@example.com",
      name: "Casey Coach",
      role: "COACH",
    }))!;
    const session = await sessionFromBearer(minted.token);
    expect(session).not.toBeNull();
    expect(session!.user).toEqual({
      id: "u1",
      role: "COACH",
      email: "coach@example.com",
      name: "Casey Coach",
      image: null,
    });
    expect(new Date(session!.expires).getTime()).toBeGreaterThan(Date.now());
  });

  it("is null for a token that doesn't verify", async () => {
    expect(await sessionFromBearer("nope")).toBeNull();
  });
});
