import { adminEmails } from "@/lib/admin";
import { operatorAlertLimiter } from "@/lib/rate-limit";
import { sendOperatorAlert } from "@/lib/services/email";

/**
 * Problems an operator has to hear about, not find. Every alert is logged
 * with a tag (one log search on "_ALERT]" finds them all) and, new here,
 * emailed to ADMIN_EMAILS, because nobody watches server logs and there is
 * no error-tracking service.
 *
 * Two kinds are emailed: a crash a person saw (web or app) and a request
 * the server failed. Mailer and rate-limit-store problems stay log-only:
 * an email about dead email cannot arrive, and the limiter that keeps these
 * emails from flooding is the thing that would be down. Both of those show
 * on the /admin health panel.
 */
export type OperatorAlertKind = "client-crash" | "server-error";

const TAGS: Record<OperatorAlertKind, string> = {
  "client-crash": "[CLIENT_ERROR_ALERT]",
  "server-error": "[SERVER_ERROR_ALERT]",
};

const SUBJECTS: Record<OperatorAlertKind, string> = {
  "client-crash": "Logbook.fit: someone hit a crash screen",
  "server-error": "Logbook.fit: a request failed on the server",
};

// Second line of defence if the shared limiter's store is down (it fails
// open): at most one email per kind per instance every ten minutes.
const LOCAL_GAP_MS = 10 * 60 * 1000;
const lastSentAt = new Map<OperatorAlertKind, number>();

/** For tests */
export function resetOperatorAlertState(): void {
  lastSentAt.clear();
}

/**
 * Log the problem and email the operators, at most three times an hour per
 * kind. Never throws and never rejects: reporting a failure must not become
 * a second failure. Resolves true when an email went out.
 */
export async function alertOperators(
  kind: OperatorAlertKind,
  summary: string,
  detail: Record<string, unknown>
): Promise<boolean> {
  const body = JSON.stringify(detail, null, 2);
  console.error(TAGS[kind], summary, JSON.stringify(detail));

  try {
    const to = adminEmails();
    if (to.length === 0) return false;

    const now = Date.now();
    const last = lastSentAt.get(kind);
    if (last !== undefined && now - last < LOCAL_GAP_MS) return false;
    if (!(await operatorAlertLimiter(kind)).allowed) return false;
    lastSentAt.set(kind, now);

    return await sendOperatorAlert(to, SUBJECTS[kind], summary, body);
  } catch {
    return false;
  }
}
