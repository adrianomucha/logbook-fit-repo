import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { findMany, deleteMany, updateMany, sendExpo, sendWeb } = vi.hoisted(() => ({
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  updateMany: vi.fn(),
  sendExpo: vi.fn(),
  sendWeb: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: { pushSubscription: { findMany, deleteMany, updateMany } },
}));
vi.mock("expo-server-sdk", () => ({
  Expo: class {
    chunkPushNotifications(messages: unknown[]) {
      return [messages];
    }
    sendPushNotificationsAsync = sendExpo;
  },
}));
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: sendWeb },
}));

import { buildExpoMessage, sendPushToUser } from "../push";

const PAYLOAD = {
  title: "Casey Coach",
  body: "How did squats go?",
  url: "/client?tab=chat",
  tag: "message:coach-1",
};

const expoRow = (token: string) => ({
  id: token,
  userId: "u1",
  provider: "EXPO",
  endpoint: token,
  p256dh: null,
  auth: null,
  userAgent: null,
  createdAt: new Date(),
  lastUsedAt: new Date(),
});

const webRow = (endpoint: string) => ({
  ...expoRow(endpoint),
  provider: "WEB",
  p256dh: "p",
  auth: "a",
});

let savedVapid: [string | undefined, string | undefined];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  deleteMany.mockResolvedValue({ count: 0 });
  updateMany.mockResolvedValue({ count: 0 });
  sendWeb.mockResolvedValue(undefined);
  savedVapid = [process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY];
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
});

afterEach(() => {
  const [pub, priv] = savedVapid;
  if (pub === undefined) delete process.env.VAPID_PUBLIC_KEY;
  else process.env.VAPID_PUBLIC_KEY = pub;
  if (priv === undefined) delete process.env.VAPID_PRIVATE_KEY;
  else process.env.VAPID_PRIVATE_KEY = priv;
});

describe("buildExpoMessage", () => {
  it("carries the deep link and tag in data, and collapses on the tag", () => {
    const msg = buildExpoMessage("ExponentPushToken[abc]", PAYLOAD);
    expect(msg).toMatchObject({
      to: "ExponentPushToken[abc]",
      title: "Casey Coach",
      body: "How did squats go?",
      sound: "default",
      data: { url: "/client?tab=chat", tag: "message:coach-1" },
      collapseId: "message:coach-1",
      threadId: "message:coach-1",
    });
    expect(msg.ttl).toBeGreaterThan(0);
  });

  it("omits collapse fields when there is no tag", () => {
    const msg = buildExpoMessage("ExponentPushToken[abc]", { ...PAYLOAD, tag: undefined });
    expect(msg.data).toEqual({ url: "/client?tab=chat" });
    expect(msg).not.toHaveProperty("collapseId");
    expect(msg).not.toHaveProperty("threadId");
  });

  it("keeps the collapse id inside APNs' 64-byte limit", () => {
    const msg = buildExpoMessage("t", { ...PAYLOAD, tag: "x".repeat(100) });
    expect(msg.collapseId).toHaveLength(64);
    expect(msg.data?.tag).toHaveLength(100);
  });
});

describe("sendPushToUser over Expo", () => {
  it("delivers to EXPO rows with no VAPID configured", async () => {
    findMany.mockResolvedValue([expoRow("ExponentPushToken[a]")]);
    sendExpo.mockResolvedValue([{ status: "ok", id: "r1" }]);

    expect(await sendPushToUser("u1", PAYLOAD)).toBe(1);
    expect(sendExpo).toHaveBeenCalledTimes(1);
    expect(sendExpo.mock.calls[0][0][0].to).toBe("ExponentPushToken[a]");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("drops a token Expo reports as no longer registered, keeps other failures", async () => {
    findMany.mockResolvedValue([
      expoRow("ExponentPushToken[gone]"),
      expoRow("ExponentPushToken[flaky]"),
      expoRow("ExponentPushToken[ok]"),
    ]);
    sendExpo.mockResolvedValue([
      { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
      { status: "error", message: "rate", details: { error: "MessageRateExceeded" } },
      { status: "ok", id: "r3" },
    ]);

    expect(await sendPushToUser("u1", PAYLOAD)).toBe(1);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { endpoint: { in: ["ExponentPushToken[gone]"] } },
    });
  });

  it("survives the Expo service being down", async () => {
    findMany.mockResolvedValue([expoRow("ExponentPushToken[a]")]);
    sendExpo.mockRejectedValue(new Error("503"));

    expect(await sendPushToUser("u1", PAYLOAD)).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("skips WEB rows without VAPID but still reaches the app", async () => {
    findMany.mockResolvedValue([webRow("https://push.example/1"), expoRow("ExponentPushToken[a]")]);
    sendExpo.mockResolvedValue([{ status: "ok", id: "r1" }]);

    expect(await sendPushToUser("u1", PAYLOAD)).toBe(1);
    expect(sendWeb).not.toHaveBeenCalled();
  });

  it("fans out to both transports when both are available", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    // The module reads VAPID at import time; re-import under the new env
    vi.resetModules();
    const { sendPushToUser: send } = await import("../push");

    findMany.mockResolvedValue([webRow("https://push.example/1"), expoRow("ExponentPushToken[a]")]);
    sendExpo.mockResolvedValue([{ status: "ok", id: "r1" }]);

    expect(await send("u1", PAYLOAD)).toBe(2);
    expect(sendWeb).toHaveBeenCalledTimes(1);
    expect(sendWeb.mock.calls[0][0]).toEqual({
      endpoint: "https://push.example/1",
      keys: { p256dh: "p", auth: "a" },
    });
    // The browser payload is unchanged — the service worker reads url/tag
    expect(JSON.parse(sendWeb.mock.calls[0][1])).toEqual(PAYLOAD);
  });

  it("returns 0 with no devices and touches nothing", async () => {
    findMany.mockResolvedValue([]);
    expect(await sendPushToUser("u1", PAYLOAD)).toBe(0);
    expect(sendExpo).not.toHaveBeenCalled();
    expect(sendWeb).not.toHaveBeenCalled();
  });
});
