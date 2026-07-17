import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseBody } from "@/lib/validations/parseBody";
import { waitlistSchema } from "@/lib/validations/schemas";
import { waitlistLimiter, getClientIp } from "@/lib/rate-limit";

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

    // Upsert so re-submitting the same email succeeds without revealing
    // whether it was already on the list, and without moving its place in line.
    await prisma.waitlistEntry.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Waitlist signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
