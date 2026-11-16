import crypto from "crypto";
import { z } from "zod";

/**
 * Cal.com webhooks, verified and narrowed to what the setup-call flow needs.
 *
 * Cal.com signs each delivery with the webhook's secret: the
 * X-Cal-Signature-256 header is the hex HMAC-SHA256 of the raw request body.
 * A webhook saved without a secret sends "no-secret-provided", which never
 * verifies, so a missing secret on either side fails closed.
 */
export function verifyCalSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature.trim(), "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export type CalBookingKind = "booked" | "rescheduled" | "cancelled";

export interface CalBookingEvent {
  kind: CalBookingKind;
  /** Cal.com's booking uid (a reschedule's is the new booking's) */
  uid: string;
  startsAt: Date;
  /** The first attendee: the coach who booked */
  email: string;
  name?: string;
  timeZone?: string;
  /** The event type's slug, to ignore bookings of other event types */
  eventSlug?: string;
}

const TRIGGERS: Record<string, CalBookingKind> = {
  BOOKING_CREATED: "booked",
  BOOKING_RESCHEDULED: "rescheduled",
  BOOKING_CANCELLED: "cancelled",
};

const webhookSchema = z.object({
  triggerEvent: z.string(),
  payload: z.object({
    uid: z.string().min(1).max(200),
    type: z.string().max(200).optional(),
    startTime: z.string(),
    attendees: z
      .array(
        z.object({
          email: z.string().trim().toLowerCase().email().max(255),
          name: z.string().max(200).optional(),
          timeZone: z.string().max(100).optional(),
        })
      )
      .min(1),
  }),
});

/**
 * The booking a delivery is about, or null for anything this flow doesn't
 * act on (PING, other triggers, payloads missing the fields it needs).
 */
export function parseCalWebhook(body: unknown): CalBookingEvent | null {
  const trigger = (body as { triggerEvent?: unknown } | null)?.triggerEvent;
  if (typeof trigger !== "string" || !(trigger in TRIGGERS)) return null;

  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) return null;

  const { payload } = parsed.data;
  const startsAt = new Date(payload.startTime);
  if (Number.isNaN(startsAt.getTime())) return null;

  const attendee = payload.attendees[0];
  return {
    kind: TRIGGERS[trigger],
    uid: payload.uid,
    startsAt,
    email: attendee.email,
    name: attendee.name,
    timeZone: attendee.timeZone,
    eventSlug: payload.type,
  };
}
