import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { userCount, requestHeaders, cookieSession } = vi.hoisted(() => ({
  userCount: vi.fn(),
  requestHeaders: { value: new Headers() },
  cookieSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: { user: { count: userCount } } }));
vi.mock("next/headers", () => ({ headers: async () => requestHeaders.value }));
vi.mock("next-auth", () => ({ getServerSession: cookieSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { createMobileToken } from "../mobile-token";
import { getSession, sessionFromBearer } from "../session";

const USER = { id: "u1", email: "coach@example.com", name: "Casey Coach", role: "COACH" };

let savedSecret: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  savedSecret = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "test-secret";
  requestHeaders.value = new Headers();
  userCount.mockResolvedValue(1);
  cookieSession.mockResolvedValue(null);
});

afterEach(() => {
  if (savedSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = savedSecret;
});

describe("sessionFromBearer", () => {
  it("yields a Session shaped exactly like the cookie one", async () => {
    const minted = (await createMobileToken(USER))!;
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

describe("getSession", () => {
  it("uses the bearer token when one is sent, and never the cookie", async () => {
    const minted = (await createMobileToken(USER))!;
    requestHeaders.value = new Headers({ authorization: `Bearer ${minted.token}` });
    cookieSession.mockResolvedValue({ user: { id: "cookie-user", role: "CLIENT" } });

    const session = await getSession();
    expect(session?.user.id).toBe("u1");
    expect(cookieSession).not.toHaveBeenCalled();
  });

  it("refuses a bad bearer rather than falling back to the cookie", async () => {
    requestHeaders.value = new Headers({ authorization: "Bearer garbage" });
    cookieSession.mockResolvedValue({ user: { id: "cookie-user", role: "CLIENT" } });

    expect(await getSession()).toBeNull();
    expect(cookieSession).not.toHaveBeenCalled();
  });

  it("falls back to the cookie session with no bearer", async () => {
    cookieSession.mockResolvedValue({ user: { id: "cookie-user", role: "CLIENT" } });
    const session = await getSession();
    expect(session?.user.id).toBe("cookie-user");
    expect(userCount).toHaveBeenCalledWith({
      where: { id: "cookie-user", deletedAt: null },
    });
  });

  it("turns away a deleted account on either path", async () => {
    userCount.mockResolvedValue(0);
    cookieSession.mockResolvedValue({ user: { id: "gone", role: "CLIENT" } });
    expect(await getSession()).toBeNull();

    const minted = (await createMobileToken(USER))!;
    requestHeaders.value = new Headers({ authorization: `Bearer ${minted.token}` });
    expect(await getSession()).toBeNull();
  });

  it("is null when nobody is signed in, without touching the database", async () => {
    expect(await getSession()).toBeNull();
    expect(userCount).not.toHaveBeenCalled();
  });
});
