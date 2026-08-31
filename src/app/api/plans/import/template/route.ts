import { NextResponse } from "next/server";
import { withCoach } from "@/lib/middleware/withAuth";
import { buildPlanTemplateWorkbook, TEMPLATE_FILENAME } from "@/lib/plan-import-xlsx";

/**
 * GET /api/plans/import/template
 * Downloads the Excel template a coach fills in and uploads back to
 * POST /api/plans/import. Generated per request so its bounds and example
 * rows can never drift from what the importer accepts.
 */
export const GET = withCoach(async () => {
  const buffer = await buildPlanTemplateWorkbook();

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${TEMPLATE_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
});
