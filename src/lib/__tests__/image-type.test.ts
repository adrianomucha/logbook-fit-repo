import { describe, it, expect } from "vitest";
import { detectImageType } from "../image-type";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

describe("detectImageType", () => {
  it("recognizes JPEG, PNG, and WebP by magic bytes", () => {
    expect(detectImageType(JPEG)).toEqual({ mime: "image/jpeg", ext: "jpg" });
    expect(detectImageType(PNG)).toEqual({ mime: "image/png", ext: "png" });
    expect(detectImageType(WEBP)).toEqual({ mime: "image/webp", ext: "webp" });
  });

  it("rejects other content, whatever the client claimed it was", () => {
    // GIF is a real image type but not on the allowlist
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);
    expect(detectImageType(gif)).toBeNull();
    // SVG (text/xml) must never pass — stored SVGs can carry scripts
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(detectImageType(svg)).toBeNull();
    // HTML posing as an image
    const html = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");
    expect(detectImageType(html)).toBeNull();
  });

  it("rejects a RIFF container that isn't WebP (e.g. WAV audio)", () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
    expect(detectImageType(wav)).toBeNull();
  });

  it("handles empty and truncated buffers", () => {
    expect(detectImageType(new Uint8Array([]))).toBeNull();
    expect(detectImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectImageType(PNG.slice(0, 6))).toBeNull();
  });
});
