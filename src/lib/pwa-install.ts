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
 *
 * ## Suppressing the prompt for people who already installed
 *
 * Three cases, only two of which are detectable:
 *
 * 1. Running *inside* the installed app — caught by `isRunningInstalled`,
 *    which reads the display mode and iOS's `navigator.standalone`.
 * 2. A Chromium tab with the app already installed — caught for free, because
 *    Chrome does not fire `beforeinstallprompt` for an installed app and the
 *    native banner only ever shows when that event arrives. This is also why
 *    `navigator.getInstalledRelatedApps()` would add nothing here; it is not
 *    an oversight.
 * 3. An iOS Safari tab with the app already on the home screen — *not*
 *    detectable. Apple exposes no installation API, and a home-screen app
 *    gets a storage container fully isolated from Safari, so it cannot leave
 *    a marker behind either. The one-shot rule below is the mitigation: the
 *    worst case is a single stray impression per device, ever.
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
  /** Result of `matchesInstalledDisplayMode` — see INSTALLED_DISPLAY_MODES. */
  displayModeInstalled: boolean;
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

/**
 * Display modes that mean "launched as an installed app rather than a tab".
 *
 * The manifest asks for `standalone`, but that is a request, not a guarantee:
 * a launch can come back as `fullscreen` or `minimal-ui` depending on the
 * platform, and an installed desktop Chromium app can run under
 * `window-controls-overlay`. Matching only `standalone` would show an install
 * banner inside the installed app.
 */
export const INSTALLED_DISPLAY_MODES = [
  'standalone',
  'fullscreen',
  'minimal-ui',
  'window-controls-overlay',
] as const;

/**
 * True when any installed-launch display mode matches. Takes the matcher as an
 * argument so the sweep stays testable without a DOM.
 */
export function matchesInstalledDisplayMode(
  matchMedia: (query: string) => boolean
): boolean {
  return INSTALLED_DISPLAY_MODES.some((mode) => matchMedia(`(display-mode: ${mode})`));
}

/** True when the page is already running as an installed app. */
export function isRunningInstalled(
  snapshot: Pick<BrowserSnapshot, 'navigatorStandalone' | 'displayModeInstalled'>
): boolean {
  return snapshot.displayModeInstalled || snapshot.navigatorStandalone;
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
