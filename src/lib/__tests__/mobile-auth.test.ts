import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { signMobileToken } from "../mobile-token";
import { getBearerUser } from "../mobile-auth";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: { user: { findFirst: vi.fn() } },
}));

const findFirst = vi.mocked(prisma.user.findFirst);

const USER_ROW = {
  id: "user_123",
  name: "Emma Wilson",
  email: "client@logbook.fit",
  role: "CLIENT",
};

function requestWithAuth(value?: string): Request {
  return new Request("http://localhost/api/mobile/auth/session", {
    headers: value ? { authorization: value } : {},
  });
}

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-for-mobile-auth-suite";
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getBearerUser", () => {
  it("returns the active user row for a valid token", async () => {
    findFirst.mockResolvedValue(USER_ROW as never);
    const token = await signMobileToken({
      userId: USER_ROW.id,
      email: USER_ROW.email,
      role: USER_ROW.role,
    });

    const user = await getBearerUser(requestWithAuth(`Bearer ${token}`));

    expect(user).toEqual(USER_ROW);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: USER_ROW.id, deletedAt: null },
      select: { id: true, name: true, email: true, role: true },
    });
  });

  it("returns null for a soft-deleted user even with a valid token", async () => {
    findFirst.mockResolvedValue(null as never);
    const token = await signMobileToken({
      userId: USER_ROW.id,
      email: USER_ROW.email,
      role: USER_ROW.role,
    });

    expect(await getBearerUser(requestWithAuth(`Bearer ${token}`))).toBeNull();
  });

  it("returns null without touching the database when the header is missing", async () => {
    expect(await getBearerUser(requestWithAuth())).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns null without touching the database for a non-Bearer header", async () => {
    expect(await getBearerUser(requestWithAuth("Basic dXNlcjpwYXNz"))).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns null without touching the database for an invalid token", async () => {
    expect(await getBearerUser(requestWithAuth("Bearer not-a-jwt"))).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
