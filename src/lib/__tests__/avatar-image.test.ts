import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { sanitizeAvatar } from "../avatar-image";
import { detectImageType } from "../image-type";

/** A 40x20 photo tagged "rotate 90°" and carrying a GPS position. */
async function phonePhoto(format: "jpeg" | "png" | "webp") {
  return new Uint8Array(
    await sharp({ create: { width: 40, height: 20, channels: 3, background: "#c33" } })
      .withMetadata({
        orientation: 6,
        exif: {
          IFD0: { Make: "PhoneCo", Model: "Phone 12" },
          IFD3: { GPSLatitudeRef: "N", GPSLatitude: "40/1 26/1 46/1" },
        },
      })
      .toFormat(format)
      .toBuffer()
  );
}

describe("sanitizeAvatar", () => {
  it.each(["jpeg", "png", "webp"] as const)("drops metadata from a %s and keeps it upright", async (format) => {
    const input = await phonePhoto(format);
    const before = await sharp(input).metadata();
    expect(before.exif).toBeDefined();

    const type = detectImageType(input)!;
    const clean = await sanitizeAvatar(input, type);
    expect(clean).not.toBeNull();

    const after = await sharp(clean!).metadata();
    expect(after.exif).toBeUndefined();
    expect(after.orientation).toBeUndefined();
    // The orientation was applied to the pixels: 40x20 tagged 90° is 20x40
    expect([after.width, after.height]).toEqual([20, 40]);
    // Same format out as in
    expect(detectImageType(clean!)).toEqual(type);
    expect(Buffer.from(clean!).includes(Buffer.from("PhoneCo"))).toBe(false);
  });

  it("refuses bytes that only look like an image", async () => {
    const fake = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 1, 2, 3]);
    expect(await sanitizeAvatar(fake, detectImageType(fake)!)).toBeNull();
  });
});
