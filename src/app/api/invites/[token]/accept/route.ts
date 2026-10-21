import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { withClient } from "@/lib/middleware/withAuth";
import { acceptInviteForClient, InviteAcceptError } from "@/lib/invite-acceptance";
import { notifyClientJoined } from "@/lib/push";

/**
 * POST /api/invites/[token]/accept
 * A signed-in client accepts a coach's invite: the path for anyone who
 * already has an account, including clients coming back after their
 * coaching ended. New accounts redeem invites through signup instead.
 */
export const POST = withClient(
  async (
    _req: Request,
    ctx: { params: Record<string, string> },
    session: Session,
    clientProfileId: string
  ) => {
    try {
      const { coachUserId } = await acceptInviteForClient({
        token: ctx.params.token,
        clientProfileId,
        clientUserId: session.user.id,
      });

      // Outside the transaction, like signup: a push failure must never undo
      // the connection
      await notifyClientJoined({
        coachUserId,
        clientName: session.user.name ?? null,
        clientProfileId,
      });

      return NextResponse.json({ accepted: true });
    } catch (error) {
      if (error instanceof InviteAcceptError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status }
        );
      }
      console.error("Invite accept error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);
