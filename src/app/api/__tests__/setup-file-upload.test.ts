import { describe, it, expect, beforeEach, vi } from "vitest";

const m = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  configured: vi.fn(),
  limiter: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: { waitlistEntry: { findUnique: m.findUnique, update: m.update } },
}));
vi.mock("@/lib/setup-file-storage", () => ({
  SETUP_FILE_MAX_BYTES: 4 * 1024 * 1024,
  setupFileStorageConfigured: m.configured,
  uploadSetupFile: m.upload,
  deleteSetupFile: m.remove,
}));
vi.mock("@/lib/rate-limit", () => ({
  setupFileLimiter: m.limiter,
  getClientIp: () => "1.2.3.4",
}));

import { PUT } from "../waitlist/setup-file/route";

const xlsx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 9, 9, 9]);

const put = (body: Uint8Array, headers: Record<string, string> = {}) =>
  PUT(
    new Request("http://x/api/waitlist/setup-file", {
      method: "PUT",
      headers: {
        "x-booking-uid": "bk_1",
        "x-file-name": encodeURIComponent("Block 1.xlsx"),
        ...headers,
      },
      body: Buffer.from(body),
    })
  );

beforeEach(() => {
  vi.clearAllMocks();
  m.configured.mockReturnValue(true);
  m.limiter.mockResolvedValue({ allowed: true });
  m.upload.mockResolvedValue(undefined);
  m.update.mockResolvedValue({});
});

describe("PUT /api/waitlist/setup-file", () => {
  it("refuses an upload without a booked call", async () => {
    m.findUnique.mockResolvedValue(null);
    expect((await put(xlsx)).status).toBe(404);

    m.findUnique.mockResolvedValue({ id: "e1", callStatus: "CANCELLED", setupFilePath: null });
    expect((await put(xlsx)).status).toBe(404);
    expect(m.upload).not.toHaveBeenCalled();
  });

  it("stores a spreadsheet under the entry, never under the coach's filename", async () => {
    m.findUnique.mockResolvedValue({ id: "e1", callStatus: "BOOKED", setupFilePath: "e1/1.csv" });

    const res = await put(xlsx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, fileName: "Block 1.xlsx" });

    const [path, , contentType] = m.upload.mock.calls[0];
    expect(path).toMatch(/^e1\/\d+\.xlsx$/);
    expect(contentType).toContain("spreadsheetml");
    expect(m.update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: expect.objectContaining({ setupFilePath: path, setupFileName: "Block 1.xlsx" }),
    });
    expect(m.remove).toHaveBeenCalledWith("e1/1.csv");
  });

  it("refuses something that isn't a spreadsheet", async () => {
    m.findUnique.mockResolvedValue({ id: "e1", callStatus: "BOOKED", setupFilePath: null });
    const res = await put(new TextEncoder().encode("%PDF-1.7"), {
      "x-file-name": "program.pdf",
    });
    expect(res.status).toBe(400);
    expect(m.upload).not.toHaveBeenCalled();
  });

  it("says so when storage isn't configured", async () => {
    m.configured.mockReturnValue(false);
    expect((await put(xlsx)).status).toBe(503);
  });
});
