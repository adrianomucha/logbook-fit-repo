/**
 * Transactional emails (waitlist + auth) via Resend's REST API.
 *
 * Best-effort by design: if RESEND_API_KEY (or WAITLIST_FROM_EMAIL) is not
 * configured, or the send fails, these resolve to false without throwing so
 * they can never block a signup or an admin action. Uses a plain fetch — no
 * SDK dependency. Callers that need to know (the invite endpoint) get the
 * boolean; the signup endpoint ignores it.
 *
 * The templates mirror the landing-page hero: mono eyebrow with a lime dot,
 * uppercase display heading with the last word in brand lime, muted body copy
 * on a dark card. Email clients don't honour <style>/external CSS or webfonts,
 * so everything is inline and Arial/Courier New stand in for IBM Plex.
 *
 * Required env to actually send:
 *   RESEND_API_KEY      — your Resend API key
 *   WAITLIST_FROM_EMAIL — verified sender, e.g. "Logbook.fit <hello@logbook.fit>"
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const BG = "#0a0a0a";
const CARD = "#111111";
const BORDER = "#262626";
const INK = "#fafafa";
const MUTED = "#a3a3a3";
const FAINT = "#525252";
const LIME = "#c6f542";
const SANS = "Arial,Helvetica,sans-serif";
const MONO = "'Courier New',Courier,monospace";

const WAITLIST_FOOTER =
  "You&rsquo;re receiving this because you joined the waitlist at";

/**
 * Shared dark-card shell so every email renders as one family. `preheader`
 * is the hidden preview line inbox lists show next to the subject;
 * `content` is the card body between the header and footer rows;
 * `footerNote` is the "why you got this" line (defaults to the waitlist
 * one) — the logbook.fit link is appended to whatever is passed.
 */
function emailShell(
  preheader: string,
  content: string,
  footerNote: string = WAITLIST_FOOTER
): string {
  return `
  <div style="margin:0;padding:0;background:${BG};">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
      ${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:48px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${CARD};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
          <tr><td height="4" style="background:${LIME};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:36px 36px 8px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MUTED};">
                  <span style="color:${LIME};">&#9679;</span>&nbsp; Logbook.fit
                </td>
                <td align="right" style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${FAINT};">
                  Private beta
                </td>
              </tr>
            </table>
            <div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
            ${content}
          </td></tr>
          <tr><td style="padding:0 36px 32px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BORDER};">
              <tr><td style="padding-top:20px;font-family:${MONO};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${FAINT};">
                Plan &middot; Train &middot; Check in
              </td></tr>
              <tr><td style="padding-top:12px;font-family:${SANS};font-size:11px;line-height:1.6;color:${FAINT};">
                ${footerNote}
                <a href="https://logbook.fit" style="color:${MUTED};text-decoration:none;">logbook.fit</a>.
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

/**
 * Display heading in the landing-hero voice: uppercase, tight, with the
 * closing words picked out in brand lime.
 */
function heading(plain: string, limePart: string): string {
  return `
            <h1 style="margin:0 0 16px 0;font-family:${SANS};font-size:30px;line-height:1.05;font-weight:800;color:${INK};text-transform:uppercase;letter-spacing:-0.5px;">
              ${plain}<br><span style="color:${LIME};">${limePart}</span>
            </h1>`;
}

/** One numbered row of the "what happens next" list. */
function stepRow(num: string, text: string, last = false): string {
  const pad = last ? "padding:14px 0 0 0;" : "padding:14px 0;";
  const rule = last ? "" : `border-bottom:1px solid ${BORDER};`;
  return `
              <tr>
                <td width="36" valign="top" style="${pad}${rule}font-family:${MONO};font-size:12px;letter-spacing:1px;color:${LIME};">${num}</td>
                <td valign="top" style="${pad}${rule}font-family:${SANS};font-size:14px;line-height:1.5;color:${MUTED};">${text}</td>
              </tr>`;
}

function welcomeHtml(): string {
  return emailShell(
    "We onboard coaches in small batches — your invite will land right here.",
    `${heading("You&rsquo;re on", "the list.")}
            <p style="margin:0 0 24px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">
              Thanks for signing up for the Logbook.fit private beta. Here&rsquo;s
              how it goes from here:
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border:1px solid ${BORDER};border-radius:12px;">
              <tr><td style="padding:8px 20px 20px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${stepRow("01", "You&rsquo;re in the queue &mdash; no forms, nothing else to fill in.")}
                  ${stepRow("02", "We onboard coaches in batches of 10 to keep the beta sharp.")}
                  ${stepRow("03", "Your invite lands in this inbox the moment your spot opens.", true)}
                </table>
              </td></tr>
            </table>
            <p style="margin:24px 0 32px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">
              Nothing else to do for now. Just keep training.
            </p>`
  );
}

function welcomeText(): string {
  return [
    "LOGBOOK.FIT — PRIVATE BETA",
    "",
    "You're on the list.",
    "",
    "Thanks for signing up for the Logbook.fit private beta. Here's how it goes from here:",
    "",
    "  01  You're in the queue — no forms, nothing else to fill in.",
    "  02  We onboard coaches in batches of 10 to keep the beta sharp.",
    "  03  Your invite lands in this inbox the moment your spot opens.",
    "",
    "Nothing else to do for now. Just keep training.",
    "",
    "Plan · Train · Check in",
    "You're receiving this because you joined the waitlist at https://logbook.fit",
  ].join("\n");
}

function inviteHtml(inviteUrl: string): string {
  return emailShell(
    "Your spot in the private beta just opened up — create your coach account.",
    `${heading("Your invite", "is ready.")}
            <p style="margin:0 0 28px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">
              Your spot in the Logbook.fit private beta just opened up. Create
              your coach account and your workspace comes ready with a starter
              exercise library.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
              <tr><td align="center" style="background:${LIME};border-radius:10px;">
                <a href="${inviteUrl}" style="display:inline-block;font-family:${SANS};font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0a0a0a;text-decoration:none;padding:15px 32px;">
                  Create your account&nbsp;&nbsp;&#8594;
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 32px 0;font-family:${SANS};font-size:13px;line-height:1.65;color:${FAINT};">
              This link is yours alone and works once. If the button doesn&rsquo;t
              work, paste this into your browser:<br>
              <a href="${inviteUrl}" style="color:${MUTED};word-break:break-all;">${inviteUrl}</a>
            </p>`
  );
}

function inviteText(inviteUrl: string): string {
  return [
    "LOGBOOK.FIT — PRIVATE BETA",
    "",
    "Your invite is ready.",
    "",
    "Your spot in the Logbook.fit private beta just opened up. Create your coach account and your workspace comes ready with a starter exercise library.",
    "",
    `Create your account: ${inviteUrl}`,
    "",
    "This link is yours alone and works once.",
    "",
    "Plan · Train · Check in",
    "You're receiving this because you joined the waitlist at https://logbook.fit",
  ].join("\n");
}

function passwordResetHtml(resetUrl: string): string {
  return emailShell(
    "Set a new password for your Logbook.fit account — this link works for 30 minutes.",
    `${heading("Reset your", "password.")}
            <p style="margin:0 0 28px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">
              Someone asked to reset the password for your Logbook.fit account.
              If that was you, set a new one below &mdash; the link works for
              30 minutes.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
              <tr><td align="center" style="background:${LIME};border-radius:10px;">
                <a href="${resetUrl}" style="display:inline-block;font-family:${SANS};font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0a0a0a;text-decoration:none;padding:15px 32px;">
                  Set new password&nbsp;&nbsp;&#8594;
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 32px 0;font-family:${SANS};font-size:13px;line-height:1.65;color:${FAINT};">
              Didn&rsquo;t ask for this? Ignore this email &mdash; your password
              is unchanged. If the button doesn&rsquo;t work, paste this into
              your browser:<br>
              <a href="${resetUrl}" style="color:${MUTED};word-break:break-all;">${resetUrl}</a>
            </p>`,
    "You&rsquo;re receiving this because a password reset was requested for your account at"
  );
}

function passwordResetText(resetUrl: string): string {
  return [
    "LOGBOOK.FIT — PRIVATE BETA",
    "",
    "Reset your password.",
    "",
    "Someone asked to reset the password for your Logbook.fit account. If that was you, set a new one here — the link works for 30 minutes:",
    "",
    resetUrl,
    "",
    "Didn't ask for this? Ignore this email — your password is unchanged.",
    "",
    "Plan · Train · Check in",
    "You're receiving this because a password reset was requested for your account at https://logbook.fit",
  ].join("\n");
}

/**
 * Shared sender. Resolves to true if the send was attempted and accepted,
 * false if skipped (unconfigured) or it failed. Never throws. The plain-text
 * part rides along for clients that prefer it and for spam-filter goodwill.
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
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
      body: JSON.stringify({ from, to, subject, html, text }),
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
  return sendEmail(
    to,
    "You're on the Logbook.fit waitlist",
    welcomeHtml(),
    welcomeText()
  );
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
  return sendEmail(
    to,
    "Your Logbook.fit invite is ready",
    inviteHtml(inviteUrl),
    inviteText(inviteUrl)
  );
}

/**
 * Send the password-reset link. Fire-and-forget from the caller's point of
 * view — the request endpoint answers identically whether or not an account
 * (or a configured mailer) exists, so nothing can be probed from timing the
 * boolean.
 */
export function sendPasswordReset(
  to: string,
  resetUrl: string
): Promise<boolean> {
  return sendEmail(
    to,
    "Reset your Logbook.fit password",
    passwordResetHtml(resetUrl),
    passwordResetText(resetUrl)
  );
}
