/**
 * "Add to Home Screen" prompting.
 *
 * iOS has no install API: Safari never fires `beforeinstallprompt`, and there
 * is no way to open the Share sheet programmatically. All a web app can do is
 * *tell* the user where the button is — which makes platform detection the
 * whole game, because instructions pointing at a Share menu the browser
 * doesn't have are worse than showing nothing at all.
 *
 * Everything here is pure so it can be unit-tested under the `node` test
 * environment: callers pass a snapshot of the browser in and get a decision
 * out. The React side of this lives in `@/components/InstallPrompt`.
 */

/** How — and whether — the current browser can install the app. */
export type InstallMethod =
  /** Chromium handed us a `beforeinstallprompt`; we can open the real dialog. */
  | 'native'
  /** iOS Safari — Share button in the browser toolbar. */
  | 'ios-safari'
  /** Chrome/Edge/Firefox/Orion on iOS 16.4+ — Share lives in their own menu. */
  | 'ios-browser'
  /** Already installed, no install path, or the user has said no. Render nothing. */
  | 'none';

export interface BrowserSnapshot {
  userAgent: string;
  /**
   * `navigator.maxTouchPoints`. iPadOS 13+ serves a desktop-Safari UA string,
   * so touch points are the only reliable way to tell an iPad from a Mac.
   */
  maxTouchPoints: number;
  /** `navigator.standalone` — iOS-only, true when launched from the home screen. */
  navigatorStandalone: boolean;
  /** `matchMedia('(display-mode: standalone)').matches`. */
  displayModeStandalone: boolean;
  /** Whether a `beforeinstallprompt` event has been captured this page view. */
  hasNativePrompt: boolean;
}

/** localStorage key. Versioned so the snooze ladder can change without
 *  inheriting counts recorded under different rules. */
export const INSTALL_PROMPT_STORAGE_KEY = 'logbook.install-prompt.v1';

export interface InstallPromptState {
  /** Epoch ms of the most recent dismissal. */
  dismissedAt?: number;
  /** How many times the user has dismissed the banner. */
  dismissCount?: number;
}

/**
 * Days to stay quiet after the 1st and 2nd dismissal. A third dismissal
 * retires the banner for good — someone who has closed it three times has
 * answered the question, and a fitness app people open daily would otherwise
 * get a lot of chances to ask again.
 */
export const SNOOZE_DAYS = [7, 30];

const DAY_MS = 86_400_000;

/** True when the page is already running as an installed app. */
export function isRunningInstalled(
  snapshot: Pick<BrowserSnapshot, 'navigatorStandalone' | 'displayModeStandalone'>
): boolean {
  return snapshot.displayModeStandalone || snapshot.navigatorStandalone;
}

export function isIOS(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  // An iPad in its default desktop mode is indistinguishable from macOS Safari
  // by UA alone. A Mac reports 0 touch points; an iPad reports 5.
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/** iOS browsers that ship their own Add to Home Screen entry (iOS 16.4+). */
const IOS_BROWSER_TOKENS = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|Orion\//;

/**
 * Real Safari is the only iOS browser reporting both a `Version/` token and a
 * `Safari/` token. Embedded WKWebViews — Instagram, WhatsApp, Facebook,
 * Messenger, LinkedIn, Gmail — report neither, and none of them offer Add to
 * Home Screen. Coaches invite clients over exactly those apps, so this branch
 * is load-bearing rather than theoretical.
 */
function isRealIOSSafari(userAgent: string): boolean {
  return userAgent.includes('Safari/') && /Version\/\d/.test(userAgent);
}

export function detectInstallMethod(snapshot: BrowserSnapshot): InstallMethod {
  if (isRunningInstalled(snapshot)) return 'none';
  // A captured native prompt beats any instructions we could write.
  if (snapshot.hasNativePrompt) return 'native';
  if (!isIOS(snapshot.userAgent, snapshot.maxTouchPoints)) return 'none';
  if (IOS_BROWSER_TOKENS.test(snapshot.userAgent)) return 'ios-browser';
  return isRealIOSSafari(snapshot.userAgent) ? 'ios-safari' : 'none';
}

export function parseInstallPromptState(raw: string | null): InstallPromptState {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const { dismissedAt, dismissCount } = parsed as Record<string, unknown>;
    return {
      dismissedAt: isFiniteNumber(dismissedAt) ? dismissedAt : undefined,
      dismissCount: isFiniteNumber(dismissCount) ? dismissCount : undefined,
    };
  } catch {
    // Corrupt or hand-edited value. Treating it as "never dismissed" is the
    // safe read: the worst case is one extra ask, not a thrown render.
    return {};
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function recordDismissal(
  state: InstallPromptState,
  now: number
): InstallPromptState {
  return { dismissedAt: now, dismissCount: (state.dismissCount ?? 0) + 1 };
}

/** True once the user has dismissed more times than the ladder has rungs. */
export function isRetired(state: InstallPromptState): boolean {
  return (state.dismissCount ?? 0) > SNOOZE_DAYS.length;
}

export function isSnoozed(state: InstallPromptState, now: number): boolean {
  const count = state.dismissCount ?? 0;
  if (count === 0) return false;

  const days = SNOOZE_DAYS[count - 1];
  if (days === undefined) return true; // retired
  // A dismissal recorded without a timestamp can't be aged out; stay quiet
  // rather than re-asking on every page view.
  if (!isFiniteNumber(state.dismissedAt)) return true;

  // Subtraction (not addition) so a clock moved backwards reads as "still
  // snoozed" instead of overflowing into an immediate re-show.
  return now - state.dismissedAt < days * DAY_MS;
}

/** The single decision the banner needs: what to render, if anything. */
export function resolveInstallPrompt(
  snapshot: BrowserSnapshot,
  state: InstallPromptState,
  now: number
): InstallMethod {
  if (isSnoozed(state, now)) return 'none';
  return detectInstallMethod(snapshot);
}
