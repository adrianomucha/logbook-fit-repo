import { describe, it, expect } from "vitest";
import {
  formatCallTime,
  normalizeCalLink,
  offersSetupCall,
  setupCallBookingUrl,
  setupCallEventSlug,
} from "@/lib/setup-call";

describe("normalizeCalLink", () => {
  it("accepts username/event-slug", () => {
    expect(normalizeCalLink("adrian/setup-call")).toBe("adrian/setup-call");
  });

  it("strips a full Cal.com URL down to the link", () => {
    expect(normalizeCalLink("https://cal.com/adrian/setup-call?month=2026-11")).toBe(
      "adrian/setup-call"
    );
    expect(normalizeCalLink("https://app.cal.com/team/logbook/setup/")).toBe(
      "team/logbook/setup"
    );
  });

  it("rejects a profile page or junk", () => {
    expect(normalizeCalLink("adrian")).toBeNull();
    expect(normalizeCalLink("")).toBeNull();
    expect(normalizeCalLink(undefined)).toBeNull();
    expect(normalizeCalLink("adrian/<script>")).toBeNull();
  });
});

describe("setup call helpers", () => {
  it("reads the event slug from the link", () => {
    expect(setupCallEventSlug("team/logbook/setup")).toBe("setup");
  });

  it("prefills the email on the booking page", () => {
    expect(setupCallBookingUrl("adrian/setup", "a+b@example.com")).toBe(
      "https://cal.com/adrian/setup?email=a%2Bb%40example.com"
    );
  });

  it("offers the call to everyone but people not coaching yet", () => {
    expect(offersSetupCall("1-5")).toBe(true);
    expect(offersSetupCall(null)).toBe(true);
    expect(offersSetupCall("not-coaching")).toBe(false);
  });

  it("formats the call in the coach's time zone, falling back to UTC", () => {
    const at = new Date("2026-11-18T13:00:00Z");
    expect(formatCallTime(at, "America/New_York")).toBe(
      "Wednesday, November 18 at 8:00 AM EST"
    );
    expect(formatCallTime(at, "Not/AZone")).toBe("Wednesday, November 18 at 1:00 PM UTC");
  });
});
