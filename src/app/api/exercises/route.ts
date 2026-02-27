import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { Session } from "next-auth";

/**
 * GET /api/exercises
 * Returns the coach's exercise library (excluding soft-deleted).
 * Optional query params: ?category=CHEST&search=bench
 */
export const GET = withCoach(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");

    const exercises = await prisma.exercise.findMany({
      where: {
        ...coachScope(coachProfileId),
        ...(category ? { category: category as never } : {}),
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(exercises);
  }
);

/**
 * POST /api/exercises
 * Creates a new exercise in the coach's library.
 */
export const POST = withCoach(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    _session: Session,
    coachProfileId: string
  ) => {
    const body = await req.json();
    const { name, category, defaultSets, defaultReps, defaultWeight, defaultRest, instructions } =
      body as {
        name?: string;
        category?: string;
        defaultSets?: number;
        defaultReps?: number;
        defaultWeight?: number;
        defaultRest?: number;
        instructions?: string;
      };

    if (!name) {
      return NextResponse.json(
        { error: "Exercise name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name (scoped to coach, non-deleted)
    const existing = await prisma.exercise.findFirst({
      where: {
        ...coachScope(coachProfileId),
        name,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An exercise with this name already exists" },
        { status: 409 }
      );
    }

    const exercise = await prisma.exercise.create({
      data: {
        coachId: coachProfileId,
        name,
        category: (category as never) ?? "OTHER",
        defaultSets,
        defaultReps,
        defaultWeight,
        defaultRest,
        instructions,
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  }
);
