import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getClientIp, setupFileLimiter } from "@/lib/rate-limit";
import { cleanFileName, detectSpreadsheetType } from "@/lib/spreadsheet-type";
import {
  SETUP_FILE_MAX_BYTES,
  deleteSetupFile,
  setupFileStorageConfigured,
  uploadSetupFile,
} from "@/lib/setup-file-storage";

export const dynamic = "force-dynamic";

const TOO_BIG = "Choose a file under 4MB";
const WRONG_TYPE = "Use an Excel, Numbers, OpenDocument or CSV file";

/**
 * PUT /api/waitlist/setup-file: the spreadsheet a coach coaches from,
 * uploaded from the waitlist confirmation screen right after booking their
 * setup call, so the import can be done before the call.
 *
 * There's no account yet, so the proof of identity is the booking: the
 * X-Booking-Uid header must match the uid the Cal.com webhook recorded for a
 * booked call. Only the person who booked has it (the booking widget hands it
 * to the page, and it's in their Cal.com confirmation). The webhook can land
 * a few seconds after the widget reports the booking, so the page retries a
 * 404 for a short while.
 *
 * The raw file is the body; X-File-Name (URI-encoded) is its name, used for
 * display and to tell apart zip-based formats. The type is decided from the
 * bytes. A new upload replaces the previous one.
 */
export async function PUT(req: Request) {
  try {
    if (!setupFileStorageConfigured()) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }

    const { allowed } = await setupFileLimiter(getClientIp(req));
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    const uid = req.headers.get("x-booking-uid")?.trim();
    if (!uid || uid.length > 200) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }

    const entry = await prisma.waitlistEntry.findUnique({
      where: { callBookingUid: uid },
      select: { id: true, callStatus: true, setupFilePath: true },
    });
    if (!entry || entry.callStatus !== "BOOKED") {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }

    // Refuse an oversized body before reading all of it
    const declaredLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > SETUP_FILE_MAX_BYTES) {
      return NextResponse.json({ error: TOO_BIG }, { status: 413 });
    }

    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength === 0) {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }
    if (bytes.byteLength > SETUP_FILE_MAX_BYTES) {
      return NextResponse.json({ error: TOO_BIG }, { status: 413 });
    }

    let rawName = "";
    try {
      rawName = decodeURIComponent(req.headers.get("x-file-name") ?? "");
    } catch {
      // A malformed name only costs the display name
    }
    const fileName = cleanFileName(rawName);
    const type = detectSpreadsheetType(bytes, fileName);
    if (!type) {
      return NextResponse.json({ error: WRONG_TYPE }, { status: 400 });
    }

    // The stored path never uses the coach's filename
    const path = `${entry.id}/${Date.now()}.${type.ext}`;
    await uploadSetupFile(path, bytes, type.contentType);
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        setupFilePath: path,
        setupFileName: fileName,
        setupFileUploadedAt: new Date(),
      },
    });
    if (entry.setupFilePath && entry.setupFilePath !== path) {
      await deleteSetupFile(entry.setupFilePath);
    }

    return NextResponse.json({ ok: true, fileName });
  } catch (error) {
    console.error("Setup file upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
