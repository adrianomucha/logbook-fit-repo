/**
 * Waitlist confirmation email via Resend's REST API.
 *
 * Best-effort by design: if RESEND_API_KEY (or WAITLIST_FROM_EMAIL) is not
 * configured, or the send fails, this resolves without throwing so it can
 * never block or fail a signup. Uses a plain fetch — no SDK dependency.
 *
 * Required env to actually send:
 *   RESEND_API_KEY      — your Resend API key
 *   WAITLIST_FROM_EMAIL — verified sender, e.g. "Logbook.fit <hello@logbook.fit>"
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function welcomeHtml(): string {
  // Inline styles only — email clients don't honour <style>/external CSS.
  return `
  <div style="margin:0;padding:0;background:#0a0a0a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#111111;border:1px solid #262626;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:32px 32px 8px 32px;">
            <p style="margin:0 0 24px 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a3a3a3;">
              <span style="color:#c6f542;">&#9679;</span> Logbook.fit
            </p>
            <h1 style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.15;font-weight:800;color:#fafafa;text-transform:uppercase;letter-spacing:-0.5px;">
              You&rsquo;re on the list.
            </h1>
            <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#a3a3a3;">
              Thanks for signing up for the Logbook.fit private beta. We&rsquo;re
              onboarding coaches in small batches, and we&rsquo;ll email you the
              moment your invite is ready.
            </p>
            <p style="margin:0 0 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#a3a3a3;">
              Nothing else to do for now. Just keep training.
            </p>
          </td></tr>
          <tr><td style="padding:0 32px 32px 32px;border-top:1px solid #262626;">
            <p style="margin:20px 0 0 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#525252;">
              Plan &middot; Train &middot; Check in
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

/**
 * Send the "you're on the list" email. Resolves to true if a send was
 * attempted and accepted, false if skipped (unconfigured) or it failed.
 * Never throws.
 */
export async function sendWaitlistWelcome(to: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_FROM_EMAIL;

  if (!apiKey || !from) {
    // Not configured — signups still succeed, they just don't get an email yet.
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "You're on the Logbook.fit waitlist",
        html: welcomeHtml(),
      }),
    });

    if (!res.ok) {
      console.error(
        "Waitlist welcome email failed:",
        res.status,
        await res.text().catch(() => "")
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("Waitlist welcome email error:", err);
    return false;
  }
}
