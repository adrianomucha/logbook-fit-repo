import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: db }));

import { IDLE_WORKOUTS_VAULT_SECRET, isValidVaultToken } from "../vault-token";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isValidVaultToken", () => {
  it("accepts the token stored in the vault", async () => {
    db.$queryRaw.mockResolvedValue([{ decrypted_secret: "s3cret" }]);
    await expect(isValidVaultToken("s3cret", IDLE_WORKOUTS_VAULT_SECRET)).resolves.toBe(true);
  });

  it("looks the secret up by name, as a bound parameter", async () => {
    db.$queryRaw.mockResolvedValue([{ decrypted_secret: "s3cret" }]);
    await isValidVaultToken("s3cret", IDLE_WORKOUTS_VAULT_SECRET);
    const [, ...values] = db.$queryRaw.mock.calls[0];
    expect(values).toEqual([IDLE_WORKOUTS_VAULT_SECRET]);
  });

  it("rejects a wrong token", async () => {
    db.$queryRaw.mockResolvedValue([{ decrypted_secret: "s3cret" }]);
    await expect(isValidVaultToken("guess", IDLE_WORKOUTS_VAULT_SECRET)).resolves.toBe(false);
  });

  it("fails closed with no token, without reading the vault", async () => {
    await expect(isValidVaultToken(null, IDLE_WORKOUTS_VAULT_SECRET)).resolves.toBe(false);
    await expect(isValidVaultToken("", IDLE_WORKOUTS_VAULT_SECRET)).resolves.toBe(false);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("fails closed when the secret is missing or empty", async () => {
    db.$queryRaw.mockResolvedValueOnce([]);
    await expect(isValidVaultToken("anything", IDLE_WORKOUTS_VAULT_SECRET)).resolves.toBe(false);
    db.$queryRaw.mockResolvedValueOnce([{ decrypted_secret: "" }]);
    await expect(isValidVaultToken("", IDLE_WORKOUTS_VAULT_SECRET)).resolves.toBe(false);
    db.$queryRaw.mockResolvedValueOnce([{ decrypted_secret: null }]);
    await expect(isValidVaultToken("null", IDLE_WORKOUTS_VAULT_SECRET)).resolves.toBe(false);
  });

  it("fails closed when there is no vault to read", async () => {
    db.$queryRaw.mockRejectedValue(new Error('relation "vault.decrypted_secrets" does not exist'));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(isValidVaultToken("anything", IDLE_WORKOUTS_VAULT_SECRET)).resolves.toBe(false);
  });
});
