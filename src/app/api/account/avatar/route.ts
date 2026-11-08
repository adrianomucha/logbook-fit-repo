import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { isLockedDemoAccount } from "@/lib/demo";
import { avatarUploadLimiter } from "@/lib/rate-limit";
import { detectImageType } from "@/lib/image-type";
import { sanitizeAvatar } from "@/lib/avatar-image";
import {
  AVATAR_MAX_BYTES,
  avatarStorageConfigured,
  deleteAvatarByUrl,
  uploadAvatar,
} from "@/lib/avatar-storage";

export const dynamic = "force-dynamic";

/**
 * PUT /api/account/avatar — replace the profile photo.
 *
 * The raw image bytes are the request body. The server decides the type by
 * sniffing magic bytes (headers and filenames are client-controlled),
 * re-encodes it to strip metadata such as GPS (lib/avatar-image.ts), stores
 * under a timestamped name so the public CDN never serves a stale cached
 * photo, then deletes the previous file best-effort.
 */
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id || isLockedDemoAccount(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!avatarStorageConfigured()) {
      return NextResponse.json(
        { error: "Photo uploads aren't configured on this deployment yet" },
        { status: 503 }
      );
    }

    const { allowed } = await avatarUploadLimiter(session.user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    // Refuse an oversized body before reading all of it
    const declaredLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > AVATAR_MAX_BYTES) {
      return NextResponse.json(
        { error: "Choose an image under 4MB" },
        { status: 413 }
      );
    }

    const buffer = new Uint8Array(await req.arrayBuffer());
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "No image received" }, { status: 400 });
    }
    if (buffer.byteLength > AVATAR_MAX_BYTES) {
      return NextResponse.json(
        { error: "Choose an image under 4MB" },
        { status: 413 }
      );
    }

    const type = detectImageType(buffer);
    if (!type) {
      return NextResponse.json(
        { error: "Use a JPG, PNG, or WebP image" },
        { status: 400 }
      );
    }

    // Drops EXIF (including GPS) before the photo goes to a public bucket
    const clean = await sanitizeAvatar(buffer, type);
    if (!clean) {
      return NextResponse.json(
        { error: "Use a JPG, PNG, or WebP image" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: session.user.id, deletedAt: null },
      select: { id: true, avatarUrl: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const path = `${user.id}-${Date.now()}.${type.ext}`;
    const avatarUrl = await uploadAvatar(path, clean, type.mime);

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
      select: { id: true },
    });

    // Only after the new photo is stored and referenced
    await deleteAvatarByUrl(user.avatarUrl);

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Couldn't upload the photo. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/account/avatar — back to the monogram.
 */
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.user?.id || isLockedDemoAccount(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: session.user.id, deletedAt: null },
      select: { id: true, avatarUrl: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
      select: { id: true },
    });
    await deleteAvatarByUrl(user.avatarUrl);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "Couldn't remove the photo. Please try again." },
      { status: 500 }
    );
  }
}
