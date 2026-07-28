/**
 * Waitlist emails via Resend's REST API.
 *
 * Best-effort by design: if RESEND_API_KEY (or WAITLIST_FROM_EMAIL) is not
 * configured, or the send fails, these resolve to false without throwing so
 * they can never block a signup or an admin action. Uses a plain fetch — no
 * SDK dependency. Callers that need to know (the invite endpoint) get the
 * boolean; the signup endpoint ignores it.
 *
 * Required env to actually send:
 *   RESEND_API_KEY      — your Resend API key
 *   WAITLIST_FROM_EMAIL — verified sender, e.g. "Logbook.fit <hello@logbook.fit>"
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Shared dark-card shell so both waitlist emails render as one family.
 * Inline styles only — email clients don't honour <style>/external CSS.
 */
function emailShell(content: string): string {
  return `
  <div style="margin:0;padding:0;background:#0a0a0a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#111111;border:1px solid #262626;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:32px 32px 8px 32px;">
            <p style="margin:0 0 24px 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a3a3a3;">
              <span style="color:#c6f542;">&#9679;</span> Logbook.fit
            </p>
            ${content}
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

function welcomeHtml(): string {
  return emailShell(`
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
            </p>`);
}

function inviteHtml(inviteUrl: string): string {
  return emailShell(`
            <h1 style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.15;font-weight:800;color:#fafafa;text-transform:uppercase;letter-spacing:-0.5px;">
              Your invite is ready.
            </h1>
            <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#a3a3a3;">
              Your spot in the Logbook.fit private beta just opened up. Create
              your coach account and your workspace comes ready with a starter
              exercise library.
            </p>
            <p style="margin:0 0 28px 0;">
              <a href="${inviteUrl}" style="display:inline-block;background:#c6f542;color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1px;text-decoration:none;padding:14px 28px;border-radius:10px;">
                Create your account
              </a>
            </p>
            <p style="margin:0 0 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#525252;">
              This link is yours alone and works once. If the button doesn&rsquo;t
              work, paste this into your browser:<br>
              <a href="${inviteUrl}" style="color:#a3a3a3;word-break:break-all;">${inviteUrl}</a>
            </p>`);
}

/**
 * Shared sender. Resolves to true if the send was attempted and accepted,
 * false if skipped (unconfigured) or it failed. Never throws.
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_FROM_EMAIL;

  if (!apiKey || !from) {
    // Not configured — the calling flow still succeeds, just without email.
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      console.error(
        `Waitlist email "${subject}" failed:`,
        res.status,
        await res.text().catch(() => "")
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Waitlist email "${subject}" error:`, err);
    return false;
  }
}

/** Send the "you're on the list" confirmation after a landing-page signup. */
export function sendWaitlistWelcome(to: string): Promise<boolean> {
  return sendEmail(to, "You're on the Logbook.fit waitlist", welcomeHtml());
}

/**
 * Send the beta invite with the single-use signup link. The caller surfaces
 * the boolean to the admin (a false means "copy the link and send it
 * yourself"), unlike the fire-and-forget welcome email.
 */
export function sendWaitlistInvite(
  to: string,
  inviteUrl: string
): Promise<boolean> {
  return sendEmail(to, "Your Logbook.fit invite is ready", inviteHtml(inviteUrl));
}
