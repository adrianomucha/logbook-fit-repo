import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET } from "../../.well-known/apple-app-site-association/route";

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.APPLE_TEAM_ID;
  delete process.env.APPLE_TEAM_ID;
});
afterEach(() => {
  if (saved === undefined) delete process.env.APPLE_TEAM_ID;
  else process.env.APPLE_TEAM_ID = saved;
});

describe("GET /.well-known/apple-app-site-association", () => {
  it("is 404 until the Team ID is configured, so links keep opening in the browser", async () => {
    expect((await GET()).status).toBe(404);
    process.env.APPLE_TEAM_ID = "not-a-team-id";
    expect((await GET()).status).toBe(404);
  });

  it("serves the association as JSON once it is", async () => {
    process.env.APPLE_TEAM_ID = " ABCDE12345 ";
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body.applinks.details[0].appIDs).toEqual(["ABCDE12345.fit.logbook.app"]);
    expect(body.applinks.details[0].components).toEqual([{ "/": "/client" }, { "/": "/client/*" }]);
  });
});
