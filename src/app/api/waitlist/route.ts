import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseBody } from "@/lib/validations/parseBody";
import { waitlistSchema } from "@/lib/validations/schemas";
import { waitlistLimiter, getClientIp } from "@/lib/rate-limit";
import { sendWaitlistWelcome } from "@/lib/services/waitlist-email";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { allowed } = await waitlistLimiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, waitlistSchema);
    if (!result.success) return result.response;

    const { email } = result.data;

    // Only the first signup for an email creates a row; repeats are quiet
    // no-ops so the response never reveals whether an email was already on
    // the list. `createMany({ skipDuplicates })` tells us if a row was added.
    const { count } = await prisma.waitlistEntry.createMany({
      data: [{ email }],
      skipDuplicates: true,
    });

    // Send the confirmation only on a genuinely new signup, and only as a
    // best-effort side effect — a mail failure must not fail the request.
    if (count > 0) {
      await sendWaitlistWelcome(email);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Waitlist signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
