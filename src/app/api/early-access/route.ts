import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseBody } from "@/lib/validations/parseBody";
import { earlyAccessSignupSchema } from "@/lib/validations/schemas";
import { earlyAccessLimiter, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const ip = getClientIp(req);
    const { allowed } = earlyAccessLimiter(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const result = await parseBody(req, earlyAccessSignupSchema);
    if (!result.success) return result.response;

    const { email } = result.data;

    // Idempotent: signing up twice with the same email is still a success,
    // and doesn't reveal whether the email was already on the list.
    await prisma.earlyAccessSignup.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Early access signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
