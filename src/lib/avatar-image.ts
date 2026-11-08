import sharp from "sharp";
import type { ImageType } from "@/lib/image-type";

/**
 * Re-encode an uploaded avatar so it carries no metadata.
 *
 * Phone photos embed EXIF, often including the GPS position where they
 * were taken, and avatars are served from a public bucket to the user's
 * coach or clients. Re-encoding through sharp drops every metadata block
 * (EXIF, XMP, comments; sharp writes none unless asked). `.rotate()` with
 * no angle first applies the EXIF orientation to the pixels, so dropping
 * the tag doesn't leave portrait photos sideways.
 *
 * The output keeps the sniffed format. Returns null when the bytes don't
 * decode as an image, or decode to more pixels than any avatar needs (a
 * 4 MB file can still claim enormous dimensions).
 */
export async function sanitizeAvatar(bytes: Uint8Array, type: ImageType): Promise<Uint8Array | null> {
  try {
    const image = sharp(bytes, { limitInputPixels: 50_000_000 }).rotate();
    const encoded =
      type.ext === "jpg"
        ? image.jpeg({ quality: 90 })
        : type.ext === "png"
          ? image.png()
          : image.webp({ quality: 90 });
    return new Uint8Array(await encoded.toBuffer());
  } catch {
    return null;
  }
}
