// Moved to @logbook/shared so the native app can use it; this keeps every
// existing import working. New code may import from either path.
export * from "@logbook/shared/types/api";

/**
 * GET /api/coach/setup-call. Web only: the native app has no coach
 * dashboard, so this stays out of @logbook/shared.
 */
export interface CoachSetupCall {
  call: { status: "BOOKED" | "CANCELLED"; startsAt: string } | null;
}
