/**
 * Transactional emails (waitlist + auth) via Resend's REST API.
 *
 * Best-effort by design: if RESEND_API_KEY (or WAITLIST_FROM_EMAIL) is not
 * configured, or the send fails, these resolve to false without throwing so
 * they can never block a signup or an admin action. Uses a plain fetch — no
 * SDK dependency. Callers that need to know (the invite endpoint) get the
 * boolean; the signup endpoint ignores it.
 *
 * The templates speak the brand's light voice (the auth pages' form column):
 * mono eyebrow with a lime dot, uppercase display heading with the closing
 * words on a lime highlight, dark ink on a white card. Light-first is a
 * deliberate constraint, not a style choice — Gmail's dark mode force-inverts
 * email colors with no reliable opt-out, and dark-designed emails come out
 * worst (flipped to a washed-out light theme). A light design survives both
 * modes predictably. Email clients don't honour <style>/external CSS or
 * webfonts, so everything is inline and Arial/Courier New stand in for
 * IBM Plex.
 *
 * Required env to actually send:
 *   RESEND_API_KEY      — your Resend API key
 *   WAITLIST_FROM_EMAIL — verified sender, e.g. "Logbook.fit <hello@logbook.fit>"
 *
 * Optional:
 *   SETUP_CALL_BOOKING_URL — a Calendly (or similar) booking page. When set,
 *     the invitation links to it as the optional setup-call route, with the
 *     coach's email pre-filled.
 *   WAITLIST_REPLY_TO_EMAIL — a monitored inbox set as Reply-To on every
 *     send. Without a booking URL, the invitation tells coaches to "reply to
 *     arrange an optional setup call" only when this is set; otherwise that
 *     instruction is left out rather than pointing replies at an inbox
 *     nobody reads.
 */

import {
  appBaseUrl,
  setupCallBookingUrl,
  withBookingPrefill,
} from "@/lib/waitlist";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Every alert-worthy mailer problem logs with this tag so one Vercel log
 * alert ("message contains [EMAIL_ALERT]") catches all of them. Without an
 * alert the failures are still one log search away — which is the whole
 * point: sends fail best-effort (silently, by design) and once burned us
 * with a week of dead email that nothing surfaced.
 */
const ALERT_TAG = "[EMAIL_ALERT]";

/**
 * True when `from` is a sender Resend will accept: `email@example.com` or
 * `Name <email@example.com>`, exactly one address. Catches the config bug
 * that broke production — two comma-separated addresses inside one <...>.
 */
function isValidFromField(from: string): boolean {
  const m = from.trim().match(/^(?:[^<>]*<([^<>]+)>|(\S+))$/);
  const addr = (m?.[1] ?? m?.[2])?.trim();
  return !!addr && /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]{2,}$/.test(addr);
}

/**
 * Health check for the mailer config, shared by the send path and the admin
 * UI banner. Pure env inspection — never sends anything.
 */
export function emailConfigStatus():
  | { ok: true }
  | { ok: false; reason: string } {
  if (!process.env.RESEND_API_KEY) {
    return {
      ok: false,
      reason:
        "RESEND_API_KEY is not set — every email (waitlist, invites, password resets) is silently skipped.",
    };
  }
  const from = process.env.WAITLIST_FROM_EMAIL;
  if (!from) {
    return {
      ok: false,
      reason:
        "WAITLIST_FROM_EMAIL is not set — every email (waitlist, invites, password resets) is silently skipped.",
    };
  }
  if (!isValidFromField(from)) {
    return {
      ok: false,
      reason: `WAITLIST_FROM_EMAIL (currently "${from}") is not a valid sender. Use "email@example.com" or "Name <email@example.com>" with exactly one address — Resend rejects every send otherwise.`,
    };
  }
  const replyTo = process.env.WAITLIST_REPLY_TO_EMAIL?.trim();
  if (replyTo && !isValidFromField(replyTo)) {
    return {
      ok: false,
      reason: `WAITLIST_REPLY_TO_EMAIL (currently "${replyTo}") is not a valid address. Use "email@example.com" or "Name <email@example.com>" with exactly one address, or unset it — until then replies are not routed and invitations don't offer the reply-to-book setup call.`,
    };
  }
  return { ok: true };
}

/**
 * The monitored Reply-To inbox, or null when none is configured (or the
 * configured value is malformed — a bad address is treated as unset so a
 * typo can't route coach replies into the void). This is also the switch
 * for the "reply to arrange a setup call" copy: the invitation email and
 * the account-creation page only ask coaches to reply when a reply will
 * actually reach someone.
 */
export function setupHelpReplyTo(): string | null {
  const replyTo = process.env.WAITLIST_REPLY_TO_EMAIL?.trim();
  if (!replyTo || !isValidFromField(replyTo)) return null;
  return replyTo;
}

const BG = "#f5f5f5";
const CARD = "#ffffff";
const PANEL = "#fafafa";
const BORDER = "#e5e5e5";
const INK = "#0a0a0a";
const MUTED = "#525252";
const FAINT = "#a3a3a3";
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
 * closing words picked out by a lime highlight. Highlight (dark ink on lime)
 * rather than lime text — lime on white fails contrast, and a saturated
 * background block survives Gmail's dark-mode color transform far better
 * than colored text does.
 */
function heading(plain: string, accentPart: string): string {
  return `
            <h1 style="margin:0 0 16px 0;font-family:${SANS};font-size:30px;line-height:1.15;font-weight:800;color:${INK};text-transform:uppercase;letter-spacing:-0.5px;">
              ${plain}<br><span style="background:${LIME};color:${INK};padding:0 8px;box-decoration-break:clone;-webkit-box-decoration-break:clone;">${accentPart}</span>
            </h1>`;
}

/** One numbered row of the "what happens next" list. */
function stepRow(num: string, text: string, last = false): string {
  const pad = last ? "padding:14px 0 0 0;" : "padding:14px 0;";
  const rule = last ? "" : `border-bottom:1px solid ${BORDER};`;
  return `
              <tr>
                <td width="36" valign="top" style="${pad}${rule}font-family:${MONO};font-size:12px;font-weight:700;letter-spacing:1px;color:${INK};">${num}</td>
                <td valign="top" style="${pad}${rule}font-family:${SANS};font-size:14px;line-height:1.5;color:${MUTED};">${text}</td>
              </tr>`;
}

/** Short sign-off shared by the waitlist emails — a person, not a system. */
function signOffHtml(): string {
  return `
            <p style="margin:0 0 32px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${INK};">
              Adrian<br>
              <span style="color:${MUTED};">Logbook.fit</span>
            </p>`;
}

const SIGN_OFF_TEXT = ["Adrian", "Logbook.fit"];

function welcomeHtml(): string {
  return emailShell(
    "Your request is saved. Here&rsquo;s what happens next.",
    `${heading("You&rsquo;re on", "the waitlist.")}
            <p style="margin:0 0 20px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">
              Thanks for joining the waitlist for the Logbook.fit private beta.
            </p>
            <p style="margin:0 0 24px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">
              Logbook.fit brings your workout plans, client check-ins, and
              follow-ups into one workspace. It&rsquo;s free to use during the
              private beta.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PANEL};border:1px solid ${BORDER};border-radius:12px;">
              <tr><td style="padding:8px 20px 20px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${stepRow("01", "Your request is saved. We invite coaches in small batches.")}
                  ${stepRow("02", "When your spot opens, we&rsquo;ll send a separate email with your account link.")}
                  ${stepRow("03", "Once invited, you can create your account and get started straight away. If you&rsquo;d like help, an optional setup call is available to set up your workspace and bring over your client roster.", true)}
                </table>
              </td></tr>
            </table>
            <p style="margin:24px 0 24px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">
              You don&rsquo;t need to do anything else for now.
            </p>
            ${signOffHtml()}`
  );
}

function welcomeText(): string {
  return [
    "LOGBOOK.FIT — PRIVATE BETA",
    "",
    "You're on the waitlist.",
    "",
    "Hi,",
    "",
    "Thanks for joining the waitlist for the Logbook.fit private beta.",
    "",
    "Logbook.fit brings your workout plans, client check-ins, and follow-ups into one workspace. It's free to use during the private beta.",
    "",
    "We invite coaches in small batches. When your spot opens, we'll send a separate email with your account link.",
    "",
    "Once invited, you can create your account and get started straight away. If you'd like help, an optional setup call is available to set up your workspace and bring over your client roster.",
    "",
    "You don't need to do anything else for now.",
    "",
    ...SIGN_OFF_TEXT,
    "",
    "Plan · Train · Check in",
    "You're receiving this because you joined the waitlist at https://logbook.fit",
  ].join("\n");
}

/**
 * How an invited coach can ask for the optional setup call. Resolved once
 * per send so the HTML and plain-text parts always agree.
 *   bookingUrl  — pick a slot yourself (preferred; pre-filled per coach)
 *   replyToBook — reply to the email (only with a monitored Reply-To)
 *   neither     — the call is still offered, without a route that dead-ends
 */
interface SetupHelp {
  bookingUrl: string | null;
  replyToBook: boolean;
}

function setupHelpHtml({ bookingUrl, replyToBook }: SetupHelp): string {
  if (bookingUrl) {
    return `Want help getting started?
              <a href="${bookingUrl}" style="color:${INK};font-weight:700;">Pick a time for an optional setup call</a>
              and we&rsquo;ll help you set up your workspace and bring over
              your client roster. You can start using Logbook.fit right away,
              whether or not you book a call.`;
  }
  return replyToBook
    ? `Want help getting started? Reply to this email to arrange an optional
              setup call. We&rsquo;ll help you set up your workspace and bring
              over your client roster. You can start using Logbook.fit right
              away, whether or not you book a call.`
    : `Want help getting started? An optional setup call is available to
              help you set up your workspace and bring over your client
              roster. You can start using Logbook.fit right away, whether or
              not you book a call.`;
}

function setupHelpText({ bookingUrl, replyToBook }: SetupHelp): string {
  if (bookingUrl) {
    return `Want help getting started? Pick a time for an optional setup call: ${bookingUrl}\nWe'll help you set up your workspace and bring over your client roster. You can start using Logbook.fit right away, whether or not you book a call.`;
  }
  return replyToBook
    ? "Want help getting started? Reply to this email to arrange an optional setup call. We'll help you set up your workspace and bring over your client roster. You can start using Logbook.fit right away, whether or not you book a call."
    : "Want help getting started? An optional setup call is available to help you set up your workspace and bring over your client roster. You can start using Logbook.fit right away, whether or not you book a call.";
}

function inviteHtml(
  inviteUrl: string,
  loginUrl: string,
  setupHelp: SetupHelp
): string {
  return emailShell(
    "Create your coach account and get help setting up.",
    `${heading("Your invitation", "is ready.")}
            <p style="margin:0 0 20px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">
              Your spot in the Logbook.fit private beta is ready.
            </p>
            <p style="margin:0 0 28px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">
              Create your coach account to start exploring. Your workspace
              includes a starter exercise library, and Logbook.fit is free to
              use during the private beta.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
              <tr><td align="center" style="background:${LIME};border-radius:10px;">
                <a href="${inviteUrl}" style="display:inline-block;font-family:${SANS};font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0a0a0a;text-decoration:none;padding:15px 32px;">
                  Create your coach account&nbsp;&nbsp;&#8594;
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 24px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${MUTED};">
              ${setupHelpHtml(setupHelp)}
            </p>
            <p style="margin:0 0 24px 0;font-family:${SANS};font-size:13px;line-height:1.65;color:${FAINT};">
              This invitation link works once. If you&rsquo;ve already created
              your account,
              <a href="${loginUrl}" style="color:${MUTED};">sign in instead</a>.
              If the button doesn&rsquo;t work, paste this into your browser:<br>
              <a href="${inviteUrl}" style="color:${MUTED};word-break:break-all;">${inviteUrl}</a>
            </p>
            ${signOffHtml()}`
  );
}

function inviteText(
  inviteUrl: string,
  loginUrl: string,
  setupHelp: SetupHelp
): string {
  return [
    "LOGBOOK.FIT — PRIVATE BETA",
    "",
    "Your invitation is ready.",
    "",
    "Hi,",
    "",
    "Your spot in the Logbook.fit private beta is ready.",
    "",
    "Create your coach account to start exploring. Your workspace includes a starter exercise library, and Logbook.fit is free to use during the private beta.",
    "",
    `Create your coach account: ${inviteUrl}`,
    "",
    setupHelpText(setupHelp),
    "",
    `This invitation link works once. If you've already created your account, sign in instead: ${loginUrl}`,
    "",
    ...SIGN_OFF_TEXT,
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
    // Normal in dev; in production it means every email is dying quietly,
    // which is exactly what the alert tag exists to make loud.
    if (process.env.NODE_ENV === "production") {
      console.error(
        `${ALERT_TAG} Email "${subject}" skipped — mailer not configured (RESEND_API_KEY / WAITLIST_FROM_EMAIL missing).`
      );
    }
    return false;
  }

  // Fail fast on a malformed sender instead of collecting a Resend 422 per
  // send — the log then names the env var to fix, not just the symptom.
  if (!isValidFromField(from)) {
    console.error(
      `${ALERT_TAG} Email "${subject}" not sent — WAITLIST_FROM_EMAIL ("${from}") is not a valid sender. Use "email@example.com" or "Name <email@example.com>" with exactly one address.`
    );
    return false;
  }

  // Optional monitored inbox. A malformed value is reported once per send
  // (and on the admin banner) and otherwise treated as unset, so it can't
  // turn every email into a 422.
  const replyTo = setupHelpReplyTo();
  const rawReplyTo = process.env.WAITLIST_REPLY_TO_EMAIL?.trim();
  if (rawReplyTo && !replyTo) {
    console.error(
      `${ALERT_TAG} WAITLIST_REPLY_TO_EMAIL ("${rawReplyTo}") is not a valid address — sending "${subject}" without a Reply-To.`
    );
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
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      console.error(
        `${ALERT_TAG} Email "${subject}" rejected by Resend:`,
        res.status,
        await res.text().catch(() => "")
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`${ALERT_TAG} Email "${subject}" send error:`, err);
    return false;
  }
}

/** Send the "you're on the waitlist" confirmation after a landing-page signup. */
export function sendWaitlistWelcome(to: string): Promise<boolean> {
  return sendEmail(
    to,
    "You're on the Logbook.fit waitlist",
    welcomeHtml(),
    welcomeText()
  );
}

/**
 * Send the beta invitation with the single-use signup link. The caller
 * surfaces the boolean to the admin (a false means "copy the link and send
 * it yourself"), unlike the fire-and-forget welcome email.
 *
 * The setup call is optional and account creation is the primary action.
 * The call's route is the booking page (`SETUP_CALL_BOOKING_URL`, pre-filled
 * with this coach's email) when there is one, else the reply-to-book line
 * when `WAITLIST_REPLY_TO_EMAIL` routes replies to a monitored inbox.
 */
export function sendWaitlistInvite(
  to: string,
  inviteUrl: string
): Promise<boolean> {
  const loginUrl = `${appBaseUrl()}/login`;
  const booking = setupCallBookingUrl();
  const setupHelp: SetupHelp = {
    bookingUrl: booking ? withBookingPrefill(booking, { email: to }) : null,
    replyToBook: setupHelpReplyTo() !== null,
  };
  return sendEmail(
    to,
    "Your Logbook.fit invitation is ready",
    inviteHtml(inviteUrl, loginUrl, setupHelp),
    inviteText(inviteUrl, loginUrl, setupHelp)
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
