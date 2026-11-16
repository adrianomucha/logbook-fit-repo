import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { signedSetupFileUrl } from "@/lib/setup-file-storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/waitlist/[id]/setup-file: download the spreadsheet a coach
 * uploaded after booking their setup call. Owner-only, session auth only (a
 * link clicked in the admin waitlist table). Redirects to a one-minute
 * signed URL on the private bucket, so the file is never public.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id },
    select: { setupFilePath: true, setupFileName: true },
  });
  if (!entry?.setupFilePath) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 404 });
  }

  try {
    const url = await signedSetupFileUrl(
      entry.setupFilePath,
      entry.setupFileName ?? "spreadsheet"
    );
    return NextResponse.redirect(url, 302);
  } catch (error) {
    console.error("Setup file download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 502 });
  }
}
