import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseBody } from "../parseBody";

const testSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json{{{",
  });
}

describe("parseBody", () => {
  it("returns success with typed data for valid input", async () => {
    const req = makeRequest({ name: "Alice", age: 30 });
    const result = await parseBody(req, testSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Alice", age: 30 });
    }
  });

  it("returns failure response for missing required fields", async () => {
    const req = makeRequest({ name: "Alice" });
    const result = await parseBody(req, testSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(result.response.status).toBe(400);
      expect(body.error).toBe("Validation failed");
      expect(body.details).toHaveProperty("age");
    }
  });

  it("returns failure response for invalid field types", async () => {
    const req = makeRequest({ name: "Alice", age: "not a number" });
    const result = await parseBody(req, testSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });

  it("returns failure response for invalid JSON", async () => {
    const req = makeInvalidJsonRequest();
    const result = await parseBody(req, testSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(result.response.status).toBe(400);
      expect(body.error).toBe("Invalid request body");
    }
  });

  it("returns multiple field errors for multiple validation failures", async () => {
    const req = makeRequest({ name: "", age: -1 });
    const result = await parseBody(req, testSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.response.json();
      expect(body.details).toHaveProperty("name");
      expect(body.details).toHaveProperty("age");
    }
  });

  it("strips unknown fields", async () => {
    const req = makeRequest({ name: "Alice", age: 30, extra: "field" });
    const result = await parseBody(req, testSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Alice", age: 30 });
      expect("extra" in result.data).toBe(false);
    }
  });

  it("works with optional fields schema", async () => {
    const optionalSchema = z.object({
      note: z.string().optional(),
    });
    const req = makeRequest({});
    const result = await parseBody(req, optionalSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBeUndefined();
    }
  });
});
