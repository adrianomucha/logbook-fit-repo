import { describe, it, expect } from "vitest";
import {
  addWeekSchema,
  isAllowedWebPushEndpoint,
  pushSubscriptionSchema,
  updateDaySchema,
  updatePlanSchema,
  updateSetsSchema,
} from "../schemas";

const set = (over: Record<string, unknown>) => ({
  sets: [
    {
      workoutExerciseId: "6f1c2a9e-1b2c-4d3e-8f4a-5b6c7d8e9f00",
      setNumber: 1,
      completed: true,
      ...over,
    },
  ],
});

describe("updateSetsSchema bounds", () => {
  it("accepts realistic logged sets", () => {
    expect(updateSetsSchema.safeParse(set({ setNumber: 20, actualWeight: 2500, actualReps: 3600 })).success).toBe(true);
  });

  it.each([
    ["setNumber", { setNumber: 21 }],
    ["setNumber overflow", { setNumber: 2 ** 31 }],
    ["actualWeight", { actualWeight: 1e300 }],
    ["actualReps", { actualReps: 3601 }],
  ])("refuses an out-of-range %s", (_label, over) => {
    expect(updateSetsSchema.safeParse(set(over)).success).toBe(false);
  });
});

describe("updatePlanSchema", () => {
  it("accepts the editor's rename up to 100 characters", () => {
    expect(updatePlanSchema.safeParse({ name: "x".repeat(100) }).success).toBe(true);
    expect(updatePlanSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
  });

  it("refuses plan sizes the rest of the app never allows", () => {
    expect(updatePlanSchema.safeParse({ workoutsPerWeek: 1_000_000 }).success).toBe(false);
    expect(updatePlanSchema.safeParse({ durationWeeks: 13 }).success).toBe(false);
    expect(updatePlanSchema.safeParse({ durationWeeks: "12" }).success).toBe(false);
  });
});

describe("updateDaySchema", () => {
  it("accepts what the editor sends, including clearing", () => {
    expect(updateDaySchema.safeParse({ name: "" }).success).toBe(true);
    expect(updateDaySchema.safeParse({ description: null }).success).toBe(true);
    expect(updateDaySchema.safeParse({ description: "x".repeat(500) }).success).toBe(true);
  });

  it("refuses unbounded text", () => {
    expect(updateDaySchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
    expect(updateDaySchema.safeParse({ description: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("addWeekSchema", () => {
  it("allows no body and up to 7 days", () => {
    expect(addWeekSchema.safeParse({}).success).toBe(true);
    expect(addWeekSchema.safeParse({ days: Array(7).fill({ name: "Push" }) }).success).toBe(true);
  });

  it("refuses more than a week of days", () => {
    expect(addWeekSchema.safeParse({ days: Array(8).fill({}) }).success).toBe(false);
  });
});

describe("web push endpoints", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://web.push.apple.com/abc",
  ])("accepts %s", (endpoint) => {
    expect(isAllowedWebPushEndpoint(endpoint)).toBe(true);
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com:8443/fcm/send/abc",
    "https://10.0.0.5/x",
    "https://evil.example/fcm.googleapis.com",
    "https://fcm.googleapis.com.evil.example/x",
    "https://evilpush.apple.com.example/x",
    "not a url",
  ])("refuses %s", (endpoint) => {
    expect(isAllowedWebPushEndpoint(endpoint)).toBe(false);
  });

  it("is enforced by the subscription schema", () => {
    const keys = { p256dh: "p", auth: "a" };
    expect(pushSubscriptionSchema.safeParse({ endpoint: "https://fcm.googleapis.com/x", keys }).success).toBe(true);
    expect(pushSubscriptionSchema.safeParse({ endpoint: "https://10.0.0.5/x", keys }).success).toBe(false);
  });
});
