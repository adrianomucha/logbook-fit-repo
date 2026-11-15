import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Smoke tests for the guards that keep one person's data away from another:
 * who may call a route at all, whose rows a query may touch, and who may run
 * the scheduled jobs. Real route handlers, with the database replaced by a
 * recorder so each test can say exactly what was (and was not) read.
 */

const { getSession, db, runScheduledCheckIns, runIdleWorkoutSweep, recordCronRun, isValidVaultToken } = vi.hoisted(() => {
  /** `model.method` of every call, in order */
  const calls: string[] = [];
  /** Canned answers per `model.method`; anything else resolves null */
  const answers: Record<string, (args: unknown) => unknown> = {};
  /** Arguments of every call, by `model.method` */
  const args: Record<string, unknown[]> = {};
  const client = new Proxy(
    {},
    {
      get: (_t, model: string) =>
        new Proxy(
          {},
          {
            get: (_m, method: string) => async (input: unknown) => {
              const key = `${model}.${method}`;
              calls.push(key);
              (args[key] ??= []).push(input);
              return answers[key] ? answers[key](input) : null;
            },
          }
        ),
    }
  );
  return {
    getSession: vi.fn(),
    db: { client, calls, answers, args },
    runScheduledCheckIns: vi.fn(),
    runIdleWorkoutSweep: vi.fn(),
    recordCronRun: vi.fn(),
    isValidVaultToken: vi.fn(),
  };
});

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/prisma", () => ({ default: db.client }));
vi.mock("@/lib/checkin-schedule", () => ({ runScheduledCheckIns, ensureScheduledCheckIn: vi.fn() }));
vi.mock("@/lib/idle-workouts", () => ({ runIdleWorkoutSweep }));
vi.mock("@/lib/cron-runs", () => ({ CRON_JOBS: { checkIns: "check-ins", idleWorkouts: "idle-workouts" }, recordCronRun }));
vi.mock("@/lib/vault-token", () => ({ IDLE_WORKOUTS_VAULT_SECRET: "idle", isValidVaultToken }));

import { GET as listClients } from "../coach/clients/route";
import { GET as getClient } from "../coach/clients/[id]/route";
import { GET as listPlans } from "../plans/route";
import { GET as getPlan } from "../plans/[id]/route";
import { GET as listExercises } from "../exercises/route";
import { PUT as updateSets } from "../client/workout/[id]/sets/route";
import { GET as weekOverview } from "../client/week-overview/route";
import { GET as thread } from "../messages/[userId]/route";
import { GET as checkInCron } from "../cron/check-ins/route";
import { GET as idleCron } from "../cron/idle-workouts/route";

const UUID = "3f2b8c1e-7a4d-4e9b-9c55-0d6a1b2c3d4e";
const params = (p: Record<string, string> = {}) => ({ params: Promise.resolve(p) });
const get = (headers: Record<string, string> = {}) => new Request("http://x", { headers });
const put = (body: unknown) =>
  new Request("http://x", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const coach = { user: { id: "coach-user", role: "COACH", email: "coach-a@example.com" } };
const client = { user: { id: "client-user", role: "CLIENT", email: "client-a@example.com" } };

let savedCronSecret: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  db.calls.length = 0;
  for (const key of Object.keys(db.answers)) delete db.answers[key];
  for (const key of Object.keys(db.args)) delete db.args[key];
  db.answers["coachProfile.findUnique"] = () => ({ id: "coach-a" });
  db.answers["clientProfile.findUnique"] = () => ({ id: "client-a" });
  savedCronSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-secret";
  isValidVaultToken.mockResolvedValue(false);
  recordCronRun.mockImplementation(async (_job: string, run: () => Promise<unknown>) => run());
});

afterEach(() => {
  if (savedCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = savedCronSecret;
});

describe("who may call a route", () => {
  const coachRoutes: [string, () => Promise<Response>][] = [
    ["GET /api/coach/clients", () => listClients(get(), params())],
    ["GET /api/coach/clients/[id]", () => getClient(get(), params({ id: "client-b" }))],
    ["GET /api/plans", () => listPlans(get(), params())],
    ["GET /api/plans/[id]", () => getPlan(get(), params({ id: "plan-b" }))],
    ["GET /api/exercises", () => listExercises(get(), params())],
  ];
  const clientRoutes: [string, () => Promise<Response>][] = [
    ["PUT /api/client/workout/[id]/sets", () => updateSets(put({ sets: [] }), params({ id: "completion-b" }))],
    ["GET /api/client/week-overview", () => weekOverview(get(), params())],
  ];

  it.each(coachRoutes)("%s refuses a signed-out request without reading anything", async (_name, call) => {
    getSession.mockResolvedValue(null);
    expect((await call()).status).toBe(403);
    expect(db.calls).toEqual([]);
  });

  it.each(coachRoutes)("%s refuses a client account", async (_name, call) => {
    getSession.mockResolvedValue(client);
    expect((await call()).status).toBe(403);
    expect(db.calls).toEqual([]);
  });

  it.each(clientRoutes)("%s refuses a signed-out request and a coach account", async (_name, call) => {
    getSession.mockResolvedValue(null);
    expect((await call()).status).toBe(403);
    getSession.mockResolvedValue(coach);
    expect((await call()).status).toBe(403);
    expect(db.calls).toEqual([]);
  });

  it("the message thread refuses a signed-out request", async () => {
    getSession.mockResolvedValue(null);
    expect((await thread(get(), params({ userId: "someone" }))).status).toBe(401);
    expect(db.calls).toEqual([]);
  });
});

describe("whose rows a query may touch", () => {
  it("a coach cannot open another coach's client: 404, and the client is never read", async () => {
    getSession.mockResolvedValue(coach);
    const res = await getClient(get(), params({ id: "client-b" }));
    expect(res.status).toBe(404);
    expect(db.args["coachClientRelationship.findFirst"][0]).toMatchObject({
      where: { coachId: "coach-a", clientId: "client-b", status: "ACTIVE" },
    });
    expect(db.calls).not.toContain("clientProfile.findUnique");
  });

  it("a coach's roster only asks for their own active relationships", async () => {
    getSession.mockResolvedValue(coach);
    db.answers["coachClientRelationship.findMany"] = () => [];
    await listClients(get(), params());
    expect(db.args["coachClientRelationship.findMany"][0]).toMatchObject({
      where: { coachId: "coach-a", status: "ACTIVE" },
    });
  });

  it("a coach cannot open another coach's plan, or a deleted one", async () => {
    getSession.mockResolvedValue(coach);
    const res = await getPlan(get(), params({ id: "plan-b" }));
    expect(res.status).toBe(404);
    expect(db.args["plan.findFirst"][0]).toMatchObject({
      where: { id: "plan-b", coachId: "coach-a", deletedAt: null },
    });
  });

  it("the plan and exercise lists are scoped to the coach and skip deleted rows", async () => {
    getSession.mockResolvedValue(coach);
    db.answers["plan.findMany"] = () => [];
    db.answers["exercise.findMany"] = () => [];
    await listPlans(get(), params());
    await listExercises(get(), params());
    expect(db.args["plan.findMany"][0]).toMatchObject({ where: { coachId: "coach-a", deletedAt: null } });
    expect(db.args["exercise.findMany"][0]).toMatchObject({ where: { coachId: "coach-a", deletedAt: null } });
  });

  it("a client cannot write sets into someone else's workout", async () => {
    getSession.mockResolvedValue(client);
    const res = await updateSets(
      put({ sets: [{ workoutExerciseId: UUID, setNumber: 1, completed: true }] }),
      params({ id: "completion-b" })
    );
    expect(res.status).toBe(404);
    expect(db.calls.filter((c) => c.startsWith("setCompletion."))).toEqual([]);
    // The lookup that decided it was scoped to the caller
    const lookup = JSON.stringify(db.args["workoutCompletion.findFirst"] ?? db.args["workoutCompletion.findUnique"]);
    expect(lookup).toContain("completion-b");
    expect(lookup).toContain("client-a");
  });

  it("two people with no active relationship cannot read a thread between them", async () => {
    getSession.mockResolvedValue(coach);
    db.answers["user.findMany"] = () => [
      { id: "coach-user", coachProfile: { id: "coach-a" }, clientProfile: null },
      { id: "stranger", coachProfile: null, clientProfile: { id: "client-z" } },
    ];
    const res = await thread(get(), params({ userId: "stranger" }));
    expect(res.status).toBe(403);
    expect(db.args["coachClientRelationship.findFirst"][0]).toMatchObject({
      where: { coachId: "coach-a", clientId: "client-z", status: "ACTIVE" },
    });
    expect(db.calls).not.toContain("message.findMany");
  });
});

describe("who may run the scheduled jobs", () => {
  it("the check-in sweep refuses a missing or wrong token and does not run", async () => {
    expect((await checkInCron(get())).status).toBe(401);
    expect((await checkInCron(get({ authorization: "Bearer nope" }))).status).toBe(401);
    expect(runScheduledCheckIns).not.toHaveBeenCalled();
  });

  it("the check-in sweep runs with the cron secret", async () => {
    runScheduledCheckIns.mockResolvedValue({ created: 2, failures: 0 });
    const res = await checkInCron(get({ authorization: "Bearer cron-secret" }));
    expect(res.status).toBe(200);
    expect(runScheduledCheckIns).toHaveBeenCalledTimes(1);
  });

  it("nothing can run the check-in sweep when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await checkInCron(get({ authorization: "Bearer cron-secret" }))).status).toBe(401);
    expect(runScheduledCheckIns).not.toHaveBeenCalled();
  });

  it("the idle-workout sweep refuses a wrong token and runs with a right one", async () => {
    expect((await idleCron(get({ authorization: "Bearer nope" }))).status).toBe(401);
    expect(runIdleWorkoutSweep).not.toHaveBeenCalled();
    runIdleWorkoutSweep.mockResolvedValue({ nudged: 0, autoFinished: 0, failures: 0 });
    expect((await idleCron(get({ authorization: "Bearer cron-secret" }))).status).toBe(200);
    expect(runIdleWorkoutSweep).toHaveBeenCalledTimes(1);
  });
});
