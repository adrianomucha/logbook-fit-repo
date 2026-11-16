import crypto from "crypto";
import { describe, it, expect } from "vitest";
import { parseCalWebhook, verifyCalSignature } from "@/lib/cal-webhook";

const sign = (body: string, secret = "whsec") =>
  crypto.createHmac("sha256", secret).update(body).digest("hex");

const delivery = (trigger: string, payload: Record<string, unknown> = {}) => ({
  triggerEvent: trigger,
  createdAt: "2026-11-16T10:00:00Z",
  payload: {
    uid: "bk_123",
    type: "setup-call",
    startTime: "2026-11-18T13:00:00Z",
    attendees: [{ email: "Coach@Example.com", name: "Sam", timeZone: "Europe/Warsaw" }],
    ...payload,
  },
});

describe("verifyCalSignature", () => {
  const body = JSON.stringify(delivery("BOOKING_CREATED"));

  it("accepts Cal.com's HMAC of the raw body", () => {
    expect(verifyCalSignature(body, sign(body), "whsec")).toBe(true);
  });

  it("rejects a wrong secret, a tampered body, or no signature", () => {
    expect(verifyCalSignature(body, sign(body, "other"), "whsec")).toBe(false);
    expect(verifyCalSignature(`${body} `, sign(body), "whsec")).toBe(false);
    expect(verifyCalSignature(body, null, "whsec")).toBe(false);
    expect(verifyCalSignature(body, "no-secret-provided", "whsec")).toBe(false);
  });
});

describe("parseCalWebhook", () => {
  it("reads a booking", () => {
    expect(parseCalWebhook(delivery("BOOKING_CREATED"))).toEqual({
      kind: "booked",
      uid: "bk_123",
      startsAt: new Date("2026-11-18T13:00:00Z"),
      email: "coach@example.com",
      name: "Sam",
      timeZone: "Europe/Warsaw",
      eventSlug: "setup-call",
    });
  });

  it("maps reschedules and cancellations", () => {
    expect(parseCalWebhook(delivery("BOOKING_RESCHEDULED"))?.kind).toBe("rescheduled");
    expect(parseCalWebhook(delivery("BOOKING_CANCELLED"))?.kind).toBe("cancelled");
  });

  it("ignores pings, other triggers and incomplete payloads", () => {
    expect(parseCalWebhook({ triggerEvent: "PING" })).toBeNull();
    expect(parseCalWebhook(delivery("MEETING_ENDED"))).toBeNull();
    expect(parseCalWebhook(delivery("BOOKING_CREATED", { attendees: [] }))).toBeNull();
    expect(parseCalWebhook(delivery("BOOKING_CREATED", { startTime: "soon" }))).toBeNull();
    expect(parseCalWebhook(null)).toBeNull();
  });
});
