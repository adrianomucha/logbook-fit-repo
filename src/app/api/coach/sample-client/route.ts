import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import { Session } from "next-auth";
import {
  createSampleClient,
  deleteSampleClient,
} from "@/lib/sample-client";

/**
 * POST /api/coach/sample-client
 * Creates a demo client with generated history so the coach can explore the
 * dashboard and check-in loop before a real client joins. Idempotent — if a
 * sample client already exists, returns it instead of creating another.
 */
export const POST = withCoach(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    session: Session,
    coachProfileId: string
  ) => {
    const result = await createSampleClient(coachProfileId, session.user.id);
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  }
);

/**
 * DELETE /api/coach/sample-client
 * Removes the sample client and all its generated data. The sample plan is
 * soft-deleted unless the coach assigned it to a real client.
 */
export const DELETE = withCoach(
  async (
    _req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const removed = await deleteSampleClient(coachProfileId);
    if (!removed) {
      return NextResponse.json({ error: "No sample client found" }, { status: 404 });
    }
    return NextResponse.json({ removed: true });
  }
);
