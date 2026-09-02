import { describe, it, expect } from "vitest";
import {
  updateProfileSchema,
  changePasswordSchema,
  BIO_MAX_LENGTH,
} from "../schemas";

describe("updateProfileSchema", () => {
  it("accepts a name alone — bio is optional", () => {
    const result = updateProfileSchema.safeParse({ name: "Adrian Mucha" });
    expect(result.success).toBe(true);
  });

  it("trims name and bio", () => {
    const result = updateProfileSchema.parse({
      name: "  Adrian  ",
      bio: "  Strength coach.  ",
    });
    expect(result.name).toBe("Adrian");
    expect(result.bio).toBe("Strength coach.");
  });

  it("rejects a blank name", () => {
    expect(updateProfileSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("accepts an empty bio — that's how it gets cleared", () => {
    const result = updateProfileSchema.parse({ name: "Adrian", bio: "" });
    expect(result.bio).toBe("");
  });

  it("rejects a bio over the limit", () => {
    const result = updateProfileSchema.safeParse({
      name: "Adrian",
      bio: "x".repeat(BIO_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts a current password plus a valid new one", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-secret-1",
      newPassword: "brand-new-2",
    });
    expect(result.success).toBe(true);
  });

  it("requires the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "brand-new-2",
    });
    expect(result.success).toBe(false);
  });

  it("holds the new password to the shared password rules", () => {
    for (const weak of ["short1", "alllttrs", "12345678", "password123"]) {
      const result = changePasswordSchema.safeParse({
        currentPassword: "old-secret-1",
        newPassword: weak,
      });
      expect(result.success).toBe(false);
    }
  });
});
