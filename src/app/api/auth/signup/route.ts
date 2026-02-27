import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { QUICK_START_EXERCISES } from "@/lib/quick-start-exercises";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role } = body as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
    };

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, name, role" },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== "COACH" && role !== "CLIENT") {
      return NextResponse.json(
        { error: "Role must be COACH or CLIENT" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check for existing active user with this email
    const existing = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user + profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role,
          ...(role === "COACH"
            ? { coachProfile: { create: {} } }
            : { clientProfile: { create: {} } }),
        },
        include: {
          coachProfile: role === "COACH",
          clientProfile: role === "CLIENT",
        },
      });

      // For coaches: clone Quick Start exercises into their library
      if (role === "COACH" && newUser.coachProfile) {
        await tx.exercise.createMany({
          data: QUICK_START_EXERCISES.map((ex) => ({
            coachId: newUser.coachProfile!.id,
            name: ex.name,
            category: ex.category,
            defaultSets: ex.defaultSets,
            defaultReps: ex.defaultReps,
            defaultRest: ex.defaultRest,
          })),
        });
      }

      return newUser;
    });

    // Return user without passwordHash
    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        ...(user.coachProfile
          ? { coachProfileId: user.coachProfile.id }
          : {}),
        ...("clientProfile" in user && user.clientProfile
          ? { clientProfileId: user.clientProfile.id }
          : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
