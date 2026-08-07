import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  emailConfigStatus,
  sendWaitlistWelcome,
} from "../email";

const savedEnv: Record<string, string | undefined> = {};

function stashEnv(keys: string[]) {
  for (const key of keys) savedEnv[key] = process.env[key];
}

beforeEach(() => {
  stashEnv(["RESEND_API_KEY", "WAITLIST_FROM_EMAIL"]);
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.WAITLIST_FROM_EMAIL = "Logbook.fit <hello@logbook.fit>";
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("emailConfigStatus", () => {
  it("passes with a valid named sender", () => {
    expect(emailConfigStatus()).toEqual({ ok: true });
  });

  it("passes with a bare address", () => {
    process.env.WAITLIST_FROM_EMAIL = "hello@logbook.fit";
    expect(emailConfigStatus()).toEqual({ ok: true });
  });

  it("fails without an API key", () => {
    delete process.env.RESEND_API_KEY;
    const status = emailConfigStatus();
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.reason).toContain("RESEND_API_KEY");
  });

  it("fails without a from address", () => {
    delete process.env.WAITLIST_FROM_EMAIL;
    const status = emailConfigStatus();
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.reason).toContain("WAITLIST_FROM_EMAIL");
  });

  it("fails on the two-addresses-in-one-bracket config that broke production", () => {
    process.env.WAITLIST_FROM_EMAIL =
      "Logbook.fit <admin_am@logbook.fit, adrianomucha+coach@gmail.com>";
    const status = emailConfigStatus();
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.reason).toContain("exactly one address");
  });

  it("fails on other malformed senders", () => {
    for (const bad of [
      "Logbook.fit hello@logbook.fit", // name without brackets
      "hello@logbook.fit, other@logbook.fit", // bare double address
      "Logbook.fit <not-an-email>",
      "<>",
    ]) {
      process.env.WAITLIST_FROM_EMAIL = bad;
      expect(emailConfigStatus().ok, `should reject: ${bad}`).toBe(false);
    }
  });
});

describe("sendEmail alerting", () => {
  it("sends through Resend when config is valid", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendWaitlistWelcome("a@b.co")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("skips the API call entirely on a malformed sender and logs the alert tag", async () => {
    process.env.WAITLIST_FROM_EMAIL =
      "Logbook.fit <admin_am@logbook.fit, adrianomucha+coach@gmail.com>";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendWaitlistWelcome("a@b.co")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[EMAIL_ALERT]")
    );
  });

  it("logs the alert tag when Resend rejects the send", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 422,
        text: async () => '{"name":"validation_error"}',
      }))
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendWaitlistWelcome("a@b.co")).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[EMAIL_ALERT]"),
      422,
      expect.any(String)
    );
  });

  it("stays quiet outside production when simply unconfigured", async () => {
    delete process.env.RESEND_API_KEY;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendWaitlistWelcome("a@b.co")).resolves.toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
