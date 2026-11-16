import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { bearerToken, isAdminEmail, isValidAdminToken } from "@/lib/admin";
import { parseBody } from "@/lib/validations/parseBody";
import { waitlistInviteSchema } from "@/lib/validations/schemas";
import { issueWaitlistInvite } from "@/lib/waitlist-invite";

export const dynamic = "force-dynamic";

/**
 * POST /api/waitlist/invite — send (or re-send) a private-beta invite.
 *
 * Authorized like the CSV export: an admin session or
 * `Authorization: Bearer <WAITLIST_ADMIN_TOKEN>` for scripts.
 *
 * See issueWaitlistInvite: a fresh single-use token, the entry marked
 * INVITED, and the signup link emailed (re-sending rotates the token). The
 * invite URL is returned either way so the admin can deliver it by hand
 * when email isn't configured or the send fails.
 */
export async function POST(req: Request) {
  try {
    const token = bearerToken(req);
    if (!isValidAdminToken(token)) {
      const session = await getSession();
      if (!isAdminEmail(session?.user?.email)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await parseBody(req, waitlistInviteSchema);
    if (!result.success) return result.response;

    const invite = await issueWaitlistInvite(result.data.id);
    if (!invite.ok) {
      return invite.reason === "not_found"
        ? NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 })
        : NextResponse.json({ error: "This person has already joined" }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      emailSent: invite.emailSent,
      inviteUrl: invite.inviteUrl,
    });
  } catch (error) {
    console.error("Waitlist invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
