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
  /** Already installed, no install path, or already offered. Render nothing. */
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

/** localStorage key. Versioned so the offer rule can change later without
 *  inheriting records written under different semantics. */
export const INSTALL_PROMPT_STORAGE_KEY = 'logbook.install-prompt.v2';

export interface InstallPromptState {
  /**
   * Epoch ms of the one time the banner was shown.
   *
   * Its presence is the entire rule. The banner is a single one-shot offer per
   * device: installing, closing, or simply reading it and moving on all leave
   * the same record behind, and none of them bring it back. Asking twice is
   * how an install nudge turns into a cookie banner.
   */
  offeredAt?: number;
}

/** True when the app has already used up its one ask on this device. */
export function hasBeenOffered(state: InstallPromptState): boolean {
  return isFiniteNumber(state.offeredAt);
}

/** The record to persist the moment the banner actually goes on screen. */
export function markOffered(now: number): InstallPromptState {
  return { offeredAt: now };
}

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
    const { offeredAt } = parsed as Record<string, unknown>;
    return isFiniteNumber(offeredAt) ? { offeredAt } : {};
  } catch {
    // Corrupt or hand-edited value. Treating it as "never offered" is the safe
    // read: the worst case is one extra ask, not a thrown render.
    return {};
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** The single decision the banner needs: what to render, if anything. */
export function resolveInstallPrompt(
  snapshot: BrowserSnapshot,
  state: InstallPromptState
): InstallMethod {
  if (hasBeenOffered(state)) return 'none';
  return detectInstallMethod(snapshot);
}
