import { describe, it, expect, beforeEach, vi } from "vitest";

// vi.mock is hoisted above imports, so the fakes it closes over must be too
const { findFirst, compare, loginLimiter, isLockedDemoAccount } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  compare: vi.fn(),
  loginLimiter: vi.fn(),
  isLockedDemoAccount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: { user: { findFirst } } }));
vi.mock("bcryptjs", () => ({ default: { compare } }));
vi.mock("@/lib/rate-limit", () => ({ loginLimiter }));
vi.mock("@/lib/demo", () => ({ isLockedDemoAccount }));

import { verifyCredentials } from "../credentials";

const USER = {
  id: "u1",
  email: "sam@example.com",
  name: "Sam",
  role: "CLIENT",
  passwordHash: "$2a$hash",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  loginLimiter.mockResolvedValue({ allowed: true });
  isLockedDemoAccount.mockReturnValue(false);
  findFirst.mockResolvedValue(USER);
  compare.mockResolvedValue(true);
});

describe("verifyCredentials", () => {
  it("returns the public user fields on success", async () => {
    const result = await verifyCredentials({
      email: "  Sam@Example.com ",
      password: "pw",
      ip: "1.2.3.4",
    });
    expect(result).toEqual({
      ok: true,
      user: { id: "u1", email: "sam@example.com", name: "Sam", role: "CLIENT" },
    });
    // Normalized email, and soft-deleted accounts excluded
    expect(findFirst).toHaveBeenCalledWith({
      where: { email: "sam@example.com", deletedAt: null },
    });
    expect(compare).toHaveBeenCalledWith("pw", "$2a$hash");
  });

  it("rate-limits by ip + normalized email, before touching the database", async () => {
    loginLimiter.mockResolvedValue({ allowed: false });
    const result = await verifyCredentials({
      email: "Sam@Example.com",
      password: "pw",
      ip: "1.2.3.4",
    });
    expect(result).toEqual({ ok: false, reason: "rate_limited" });
    expect(loginLimiter).toHaveBeenCalledWith("1.2.3.4:sam@example.com");
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("refuses a locked demo account before the rate limit and the password", async () => {
    isLockedDemoAccount.mockReturnValue(true);
    const result = await verifyCredentials({
      email: "coach@logbook.fit",
      password: "demo1234",
      ip: "1.2.3.4",
    });
    expect(result).toEqual({ ok: false, reason: "demo_locked" });
    expect(loginLimiter).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("gives unknown email and wrong password the same answer", async () => {
    findFirst.mockResolvedValueOnce(null);
    const unknown = await verifyCredentials({
      email: "nobody@example.com",
      password: "pw",
      ip: "ip",
    });
    compare.mockResolvedValueOnce(false);
    const wrong = await verifyCredentials({
      email: "sam@example.com",
      password: "bad",
      ip: "ip",
    });
    expect(unknown).toEqual({ ok: false, reason: "invalid" });
    expect(wrong).toEqual(unknown);
  });

  it("treats missing fields and a database failure as invalid", async () => {
    expect(await verifyCredentials({ email: "", password: "pw", ip: "ip" })).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await verifyCredentials({ email: "a@b.co", password: null, ip: "ip" })).toEqual({
      ok: false,
      reason: "invalid",
    });
    findFirst.mockRejectedValueOnce(new Error("db down"));
    expect(await verifyCredentials({ email: "a@b.co", password: "pw", ip: "ip" })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});
