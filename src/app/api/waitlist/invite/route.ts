import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { bearerToken, isAdminEmail, isValidAdminToken } from "@/lib/admin";
import { parseBody } from "@/lib/validations/parseBody";
import { waitlistInviteSchema } from "@/lib/validations/schemas";
import { generateSecureToken } from "@/lib/tokens";
import { appBaseUrl, waitlistInvitePath } from "@/lib/waitlist";
import { sendWaitlistInvite } from "@/lib/services/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/waitlist/invite — send (or re-send) a private-beta invite.
 *
 * Authorized like the CSV export: an admin session or
 * `Authorization: Bearer <WAITLIST_ADMIN_TOKEN>` for scripts.
 *
 * Generates a fresh single-use token, marks the entry INVITED, and emails
 * the signup link. Re-sending rotates the token, so the previously emailed
 * link stops working — rotation doubles as revocation. The invite URL is
 * returned either way so the admin can deliver it by hand when email isn't
 * configured or the send fails.
 */
export async function POST(req: Request) {
  try {
    const token = bearerToken(req);
    if (!isValidAdminToken(token)) {
      const session = await getServerSession(authOptions);
      if (!isAdminEmail(session?.user?.email)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await parseBody(req, waitlistInviteSchema);
    if (!result.success) return result.response;

    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: result.data.id },
      select: { id: true, email: true, status: true },
    });
    if (!entry) {
      return NextResponse.json(
        { error: "Waitlist entry not found" },
        { status: 404 }
      );
    }
    if (entry.status === "JOINED") {
      return NextResponse.json(
        { error: "This person has already joined" },
        { status: 409 }
      );
    }

    // The JOINED guard in the WHERE closes the race against a concurrent
    // redemption — a signup between the read above and this write makes
    // count 0 instead of silently un-joining the entry.
    const inviteToken = generateSecureToken();
    const { count } = await prisma.waitlistEntry.updateMany({
      where: { id: entry.id, status: { not: "JOINED" } },
      data: { status: "INVITED", inviteToken, invitedAt: new Date() },
    });
    if (count === 0) {
      return NextResponse.json(
        { error: "This person has already joined" },
        { status: 409 }
      );
    }

    const inviteUrl = `${appBaseUrl()}${waitlistInvitePath(inviteToken)}`;
    const emailSent = await sendWaitlistInvite(entry.email, inviteUrl);

    return NextResponse.json({ ok: true, emailSent, inviteUrl });
  } catch (error) {
    console.error("Waitlist invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
