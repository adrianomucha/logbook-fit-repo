import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  emailConfigStatus,
  sendWaitlistInvite,
  sendWaitlistWelcome,
  setupHelpReplyTo,
} from "../email";

const savedEnv: Record<string, string | undefined> = {};

function stashEnv(keys: string[]) {
  for (const key of keys) savedEnv[key] = process.env[key];
}

beforeEach(() => {
  stashEnv(["RESEND_API_KEY", "WAITLIST_FROM_EMAIL", "WAITLIST_REPLY_TO_EMAIL", "NEXTAUTH_URL"]);
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.WAITLIST_FROM_EMAIL = "Logbook.fit <hello@logbook.fit>";
  delete process.env.WAITLIST_REPLY_TO_EMAIL;
  process.env.NEXTAUTH_URL = "https://logbook.fit";
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

describe("setup-help reply route", () => {
  function sentBody(fetchMock: ReturnType<typeof vi.fn>) {
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    return JSON.parse(init.body) as {
      subject: string;
      html: string;
      text: string;
      reply_to?: string;
    };
  }

  it("sends no Reply-To and no reply instruction when no inbox is configured", async () => {
    delete process.env.WAITLIST_REPLY_TO_EMAIL;
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    expect(setupHelpReplyTo()).toBeNull();
    await expect(
      sendWaitlistInvite("a@b.co", "https://logbook.fit/signup?beta=tok")
    ).resolves.toBe(true);

    const body = sentBody(fetchMock);
    expect(body.reply_to).toBeUndefined();
    expect(body.subject).toBe("Your Logbook.fit invitation is ready");
    // The call is still offered as optional help, just without a dead-end route.
    expect(body.html).toContain("optional");
    expect(body.text).toContain("optional setup call");
    expect(body.html).not.toContain("Reply to this email");
    expect(body.text).not.toContain("Reply to this email");
    // Account creation stays the primary action, with a sign-in fallback.
    expect(body.html).toContain("https://logbook.fit/signup?beta=tok");
    expect(body.text).toContain("Create your coach account: https://logbook.fit/signup?beta=tok");
    expect(body.text).toContain("/login");
  });

  it("sets Reply-To and ships the reply-to-book line once a monitored inbox is configured", async () => {
    process.env.WAITLIST_REPLY_TO_EMAIL = "Adrian <adrian@logbook.fit>";
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    expect(setupHelpReplyTo()).toBe("Adrian <adrian@logbook.fit>");
    await sendWaitlistInvite("a@b.co", "https://logbook.fit/signup?beta=tok");

    const body = sentBody(fetchMock);
    expect(body.reply_to).toBe("Adrian <adrian@logbook.fit>");
    expect(body.html).toContain("Reply to this email to arrange an optional");
    expect(body.text).toContain("Reply to this email to arrange an optional setup call");
    expect(body.text).toContain("whether or not you book a call");
  });

  it("treats a malformed Reply-To as unset, flags it, and still sends", async () => {
    process.env.WAITLIST_REPLY_TO_EMAIL = "Adrian <a@x.com, b@x.com>";
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(setupHelpReplyTo()).toBeNull();
    const status = emailConfigStatus();
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.reason).toContain("WAITLIST_REPLY_TO_EMAIL");

    await expect(sendWaitlistWelcome("a@b.co")).resolves.toBe(true);
    expect(sentBody(fetchMock).reply_to).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("WAITLIST_REPLY_TO_EMAIL")
    );
  });

  it("welcome email describes the waitlist, the separate invitation, and the optional call", async () => {
    delete process.env.WAITLIST_REPLY_TO_EMAIL;
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await sendWaitlistWelcome("a@b.co");
    const body = sentBody(fetchMock);
    expect(body.subject).toBe("You're on the Logbook.fit waitlist");
    expect(body.text).toContain("separate email with your account link");
    expect(body.text).toContain("optional setup call");
    expect(body.text).not.toContain("batches of 10");
    expect(body.html).not.toContain("batches of 10");
  });
});
