import { NextResponse } from "next/server";
import { Session } from "next-auth";
import { withCoach } from "@/lib/middleware/withAuth";
import prisma from "@/lib/prisma";
import { coachScope } from "@/lib/scoping";
import { planImportAiLimiter } from "@/lib/rate-limit";
import { createPlanSchema } from "@/lib/validations/schemas";
import {
  collectImportExercises,
  importErrorBody,
  parseImportRows,
  type PlanImportPreview,
  type RawImportRow,
} from "@/lib/plan-import";
import {
  findTemplateRows,
  loadWorkbook,
  TEMPLATE_HEADERS_MISSING_ERROR,
  workbookToText,
} from "@/lib/plan-import-xlsx";
import { aiImportConfigured, readPlanWithAi } from "@/lib/plan-import-ai";
import { normalizeWeightUnit } from "@logbook/shared/weight-units";

export const dynamic = "force-dynamic";

// Reading a large free-form plan with the AI reader can take a few minutes
export const maxDuration = 300;

/** Plan spreadsheets are tiny; anything bigger than this isn't one. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/**
 * POST /api/plans/import/preview
 * Reads an uploaded spreadsheet (multipart: `file` plus the plan `name`) and
 * returns the plan it would create, without saving anything. A sheet laid
 * out like the template is read directly; any other layout goes to the AI
 * reader. The coach reviews the result, then POST /api/plans/import creates
 * it from the returned rows. Bad rows come back as
 * `rowErrors: [{ row, sheet?, message }]`, like the import itself.
 */
export const POST = withCoach(
  async (
    req: Request,
    _ctx: { params: Record<string, string> },
    session: Session,
    coachProfileId: string
  ) => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "Expected a file upload" }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Attach your spreadsheet" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is too large — a plan spreadsheet stays well under 2 MB" },
        { status: 413 }
      );
    }

    // Checked before any reading, so a taken name never costs an AI read
    const meta = createPlanSchema.pick({ name: true }).safeParse({ name: form.get("name") });
    if (!meta.success) {
      const issue = meta.error.issues[0];
      return NextResponse.json(
        { error: issue ? issue.message : "Invalid plan name" },
        { status: 400 }
      );
    }
    const existingPlan = await prisma.plan.findFirst({
      where: { ...coachScope(coachProfileId), sourceTemplateId: null, name: meta.data.name },
    });
    if (existingPlan) {
      return NextResponse.json({ error: "A plan with this name already exists" }, { status: 409 });
    }

    const loaded = await loadWorkbook(Buffer.from(await file.arrayBuffer()), file.name);
    if (!loaded.ok) {
      return NextResponse.json({ error: loaded.error }, { status: 400 });
    }

    let source: PlanImportPreview["source"] = "template";
    let rows: RawImportRow[] | null = findTemplateRows(loaded.workbook);
    let warnings: string[] = [];

    if (!rows) {
      if (!aiImportConfigured()) {
        return NextResponse.json({ error: TEMPLATE_HEADERS_MISSING_ERROR }, { status: 400 });
      }
      const text = workbookToText(loaded.workbook);
      if (!text.ok) {
        return NextResponse.json({ error: text.error }, { status: 400 });
      }
      const { allowed } = await planImportAiLimiter(session.user.id);
      if (!allowed) {
        return NextResponse.json(
          { error: "Too many spreadsheets read in the last hour. Try again later, or use the template." },
          { status: 429 }
        );
      }
      const read = await readPlanWithAi(text.text);
      if (!read.ok) {
        return NextResponse.json({ error: read.error }, { status: 422 });
      }
      source = "ai";
      rows = read.rows;
      warnings = read.warnings;
    }

    // Unlabelled weight cells are in the coach's own unit (Settings)
    const coachUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { weightUnit: true },
    });
    const weightUnit = normalizeWeightUnit(coachUser?.weightUnit);
    const { plan, errors } = parseImportRows(rows, weightUnit);
    if (!plan) {
      return NextResponse.json({ ...importErrorBody(errors), source }, { status: 400 });
    }

    const wanted = collectImportExercises(plan);
    const existingExercises = await prisma.exercise.findMany({
      where: {
        ...coachScope(coachProfileId),
        name: { in: wanted.map((w) => w.name), mode: "insensitive" },
      },
      select: { name: true },
    });
    const known = new Set(existingExercises.map((e) => e.name.toLowerCase()));

    const preview: PlanImportPreview = {
      source,
      rows,
      plan,
      newExercises: wanted.map((w) => w.name).filter((name) => !known.has(name.toLowerCase())),
      warnings,
      weightUnit,
    };
    return NextResponse.json(preview);
  }
);
