import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { ExerciseCategory } from "../../../../../generated/prisma/client";

const QUICK_START_EXERCISES: {
  name: string;
  category: ExerciseCategory;
  defaultSets: number;
  defaultReps: number;
  defaultRest?: number;
}[] = [
  { name: "Barbell Bench Press", category: "CHEST", defaultSets: 4, defaultReps: 8 },
  { name: "Incline Dumbbell Press", category: "CHEST", defaultSets: 3, defaultReps: 10 },
  { name: "Barbell Back Squat", category: "LEGS", defaultSets: 4, defaultReps: 6 },
  { name: "Romanian Deadlift", category: "LEGS", defaultSets: 3, defaultReps: 10 },
  { name: "Leg Press", category: "LEGS", defaultSets: 3, defaultReps: 12 },
  { name: "Conventional Deadlift", category: "BACK", defaultSets: 3, defaultReps: 5 },
  { name: "Barbell Row", category: "BACK", defaultSets: 4, defaultReps: 8 },
  { name: "Lat Pulldown", category: "BACK", defaultSets: 3, defaultReps: 10 },
  { name: "Overhead Press", category: "SHOULDERS", defaultSets: 3, defaultReps: 8 },
  { name: "Lateral Raise", category: "SHOULDERS", defaultSets: 3, defaultReps: 15 },
  { name: "Barbell Curl", category: "BICEPS", defaultSets: 3, defaultReps: 10 },
  { name: "Hammer Curl", category: "BICEPS", defaultSets: 3, defaultReps: 12 },
  { name: "Tricep Pushdown", category: "TRICEPS", defaultSets: 3, defaultReps: 12 },
  { name: "Overhead Tricep Extension", category: "TRICEPS", defaultSets: 3, defaultReps: 10 },
  { name: "Hip Thrust", category: "GLUTES", defaultSets: 3, defaultReps: 10 },
  { name: "Bulgarian Split Squat", category: "LEGS", defaultSets: 3, defaultReps: 10 },
  { name: "Cable Row", category: "BACK", defaultSets: 3, defaultReps: 12 },
  { name: "Face Pull", category: "SHOULDERS", defaultSets: 3, defaultReps: 15 },
  { name: "Plank", category: "CORE", defaultSets: 3, defaultReps: 60, defaultRest: 30 },
  { name: "Cable Crunch", category: "CORE", defaultSets: 3, defaultReps: 15 },
  { name: "Pull-Up", category: "BACK", defaultSets: 3, defaultReps: 8 },
  { name: "Dumbbell Bench Press", category: "CHEST", defaultSets: 3, defaultReps: 10 },
  { name: "Leg Curl", category: "LEGS", defaultSets: 3, defaultReps: 12 },
  { name: "Leg Extension", category: "LEGS", defaultSets: 3, defaultReps: 12 },
  { name: "Calf Raise", category: "LEGS", defaultSets: 4, defaultReps: 15 },
];

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
