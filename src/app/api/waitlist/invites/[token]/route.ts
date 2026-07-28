import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/waitlist/invites/[token]
 * Public endpoint — validates a private-beta invite token for the signup
 * page, mirroring /api/invites/[token] for client invites. No auth (the
 * invitee isn't logged in yet); the token itself is the credential.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json(
      { valid: false, reason: "not_found" },
      { status: 404 }
    );
  }

  const entry = await prisma.waitlistEntry.findUnique({
    where: { inviteToken: token },
    select: { email: true, status: true },
  });

  if (!entry) {
    return NextResponse.json(
      { valid: false, reason: "not_found" },
      { status: 404 }
    );
  }

  // The token survives redemption (kept for audit), so a second visit gets
  // a friendly "already used" instead of a dead link.
  if (entry.status === "JOINED") {
    return NextResponse.json({ valid: false, reason: "used" }, { status: 410 });
  }

  return NextResponse.json({ valid: true, email: entry.email });
}
