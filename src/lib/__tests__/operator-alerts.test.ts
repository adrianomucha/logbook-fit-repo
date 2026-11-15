import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { operatorAlertLimiter, sendOperatorAlert } = vi.hoisted(() => ({
  operatorAlertLimiter: vi.fn(),
  sendOperatorAlert: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({ operatorAlertLimiter }));
vi.mock("@/lib/services/email", () => ({ sendOperatorAlert }));

import { alertOperators, resetOperatorAlertState } from "../operator-alerts";

let savedAdmins: string | undefined;
let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  resetOperatorAlertState();
  savedAdmins = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "owner@example.com, second@example.com";
  operatorAlertLimiter.mockResolvedValue({ allowed: true });
  sendOperatorAlert.mockResolvedValue(true);
  logged = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  if (savedAdmins === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = savedAdmins;
  logged.mockRestore();
});

describe("alertOperators", () => {
  it("logs with the alert tag and emails every admin", async () => {
    const sent = await alertOperators("client-crash", "Cannot read x", { platform: "ios" });
    expect(sent).toBe(true);
    expect(logged.mock.calls[0][0]).toBe("[CLIENT_ERROR_ALERT]");
    expect(sendOperatorAlert).toHaveBeenCalledWith(
      ["owner@example.com", "second@example.com"],
      expect.stringContaining("crash"),
      "Cannot read x",
      expect.stringContaining('"platform": "ios"')
    );
  });

  it("still logs when nobody is on the admin list, and sends nothing", async () => {
    process.env.ADMIN_EMAILS = "";
    expect(await alertOperators("server-error", "boom", {})).toBe(false);
    expect(logged.mock.calls[0][0]).toBe("[SERVER_ERROR_ALERT]");
    expect(sendOperatorAlert).not.toHaveBeenCalled();
  });

  it("does not email a second crash straight after the first, but logs both", async () => {
    await alertOperators("client-crash", "first", {});
    expect(await alertOperators("client-crash", "second", {})).toBe(false);
    expect(sendOperatorAlert).toHaveBeenCalledTimes(1);
    expect(logged).toHaveBeenCalledTimes(2);
  });

  it("throttles each kind on its own", async () => {
    await alertOperators("client-crash", "crash", {});
    expect(await alertOperators("server-error", "500", {})).toBe(true);
    expect(sendOperatorAlert).toHaveBeenCalledTimes(2);
  });

  it("honours the shared hourly limit", async () => {
    operatorAlertLimiter.mockResolvedValue({ allowed: false });
    expect(await alertOperators("server-error", "boom", {})).toBe(false);
    expect(operatorAlertLimiter).toHaveBeenCalledWith("server-error");
    expect(sendOperatorAlert).not.toHaveBeenCalled();
  });

  it("never throws, even when sending does", async () => {
    sendOperatorAlert.mockRejectedValue(new Error("mailer down"));
    await expect(alertOperators("server-error", "boom", {})).resolves.toBe(false);
  });
});
