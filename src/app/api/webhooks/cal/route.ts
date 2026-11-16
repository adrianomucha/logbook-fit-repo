import { NextResponse } from "next/server";
import { parseCalWebhook, verifyCalSignature } from "@/lib/cal-webhook";
import { setupCallEventSlug, setupCallLink } from "@/lib/setup-call";
import {
  recordSetupCallBooked,
  recordSetupCallCancelled,
} from "@/lib/setup-call-booking";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/cal: Cal.com booking events for the setup call.
 *
 * Set up in Cal.com on the setup-call event type (Advanced > Webhooks), with
 * this URL, a secret equal to CAL_WEBHOOK_SECRET, and the Booking Created,
 * Rescheduled and Cancelled triggers. Bookings of any other event type are
 * ignored, so a user-level webhook works too.
 *
 * Answers 2xx for anything it chooses to ignore, so Cal.com doesn't retry
 * deliveries that will never be acted on.
 */
export async function POST(req: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[CAL_ALERT] CAL_WEBHOOK_SECRET is not set: setup-call bookings are not being recorded and no invites go out on booking."
    );
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const raw = await req.text();
  if (!verifyCalSignature(raw, req.headers.get("x-cal-signature-256"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = parseCalWebhook(body);
  if (!event) return NextResponse.json({ ok: true, ignored: true });

  const link = setupCallLink();
  if (link && event.eventSlug && event.eventSlug !== setupCallEventSlug(link)) {
    console.warn(
      `[CAL_ALERT] Ignored a "${event.eventSlug}" booking: the setup call is "${setupCallEventSlug(link)}" (NEXT_PUBLIC_CAL_SETUP_CALL_LINK).`
    );
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    if (event.kind === "cancelled") {
      await recordSetupCallCancelled(event.uid);
      return NextResponse.json({ ok: true });
    }
    const result = await recordSetupCallBooked(event);
    if (result.outcome === "invited" && !result.emailSent) {
      console.error(
        `[EMAIL_ALERT] A setup call was booked but the beta invite email did not send. Send it from /admin?tab=waitlist.`
      );
    }
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch (error) {
    // A 500 makes Cal.com retry, which is what we want for a database blip
    console.error("Cal.com webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
