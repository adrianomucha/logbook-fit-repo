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
  /** Safari 17+ on a Mac: File ▸ Add to Dock (macOS Sonoma and later). */
  | 'macos-safari'
  /** A client on an iPhone or iPad, and the real app is in the App Store. */
  | 'app-store'
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
  /**
   * The page was opened by the native app, in its in-app browser sheet. On iOS
   * that sheet's user agent is identical to Safari's, so the app tags its links
   * instead (see `@logbook/shared/app-handoff`). Someone who has the real app
   * has nothing to install.
   */
  openedFromNativeApp: boolean;
  /**
   * The signed-in account has used the native app (`hasNativeApp` on
   * /api/me). Covers what the link tag cannot: someone with the app who
   * arrives in real Safari, say from a password reset email.
   */
  accountHasNativeApp: boolean;
  /**
   * The client app has an App Store page (NEXT_PUBLIC_APP_STORE_URL is
   * set). On iOS the banner then offers the real app, not the home screen.
   */
  appStoreAvailable?: boolean;
}

/** localStorage key remembering that this browser is the native app's sheet.
 *  The sheet keeps its own storage, apart from Safari's, so the mark never
 *  leaks into a real browser. */
export const NATIVE_APP_STORAGE_KEY = 'logbook.opened-from-native-app.v1';

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
  /**
   * Epoch ms of the one time the App Store banner was shown. Kept apart from
   * `offeredAt`: the real app is a different, better offer, so someone who
   * was shown "Add to Home Screen" before it existed still gets told once.
   */
  appOfferedAt?: number;
}

/** True when the app has already used up its one ask on this device. */
export function hasBeenOffered(state: InstallPromptState): boolean {
  return isFiniteNumber(state.offeredAt);
}

/** True when this device has already been told about the App Store app. */
export function hasBeenOfferedApp(state: InstallPromptState): boolean {
  return isFiniteNumber(state.appOfferedAt);
}

/**
 * The record to persist the moment the banner actually goes on screen.
 * Showing the App Store banner spends both asks: there is no reason to
 * follow it with "Add to Home Screen". Earlier marks are kept.
 */
export function markOffered(
  now: number,
  method: InstallMethod = 'none',
  previous: InstallPromptState = {}
): InstallPromptState {
  return {
    ...previous,
    offeredAt: previous.offeredAt ?? now,
    ...(method === 'app-store' ? { appOfferedAt: now } : {}),
  };
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

/**
 * Who the banner is for. Coaches run their business from a laptop, so their
 * banner also covers Safari on a Mac; a client logs workouts on their phone,
 * and pointing them at a Dock would be an ask about the wrong device.
 */
export type InstallAudience = 'coach' | 'client';

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

/**
 * Safari on a Mac, version 17 or later, the first with Add to Dock. Chrome,
 * Edge and Firefox on macOS carry no `Version/` token, so the Safari check
 * alone tells them apart. The UA can't say which macOS it runs on (it is frozen
 * at 10_15_7), so Safari 17 on Ventura still lands here; the steps name
 * Sonoma so that reader knows why the menu item is missing.
 */
export function isMacSafari(userAgent: string, maxTouchPoints: number): boolean {
  if (!/Macintosh/.test(userAgent) || isIOS(userAgent, maxTouchPoints)) return false;
  if (!isRealIOSSafari(userAgent)) return false;
  const version = /Version\/(\d+)/.exec(userAgent);
  return version !== null && Number(version[1]) >= 17;
}

export function detectInstallMethod(
  snapshot: BrowserSnapshot,
  audience: InstallAudience = 'client'
): InstallMethod {
  if (isRunningInstalled(snapshot)) return 'none';
  if (snapshot.openedFromNativeApp) return 'none';
  // Clients only. The native app is the client app; a coach who signs in to
  // it is sent back to the web, so installing the web app is still their path.
  if (audience === 'client' && snapshot.accountHasNativeApp) return 'none';
  // A captured native prompt beats any instructions we could write.
  if (snapshot.hasNativePrompt) return 'native';
  if (audience === 'coach' && isMacSafari(snapshot.userAgent, snapshot.maxTouchPoints)) {
    return 'macos-safari';
  }
  if (!isIOS(snapshot.userAgent, snapshot.maxTouchPoints)) return 'none';
  // The real app beats a home-screen shortcut, and unlike that shortcut a
  // link to the App Store works in every iOS browser, in-app ones included.
  // Clients only: the app is the client's side.
  if (audience === 'client' && snapshot.appStoreAvailable) return 'app-store';
  if (IOS_BROWSER_TOKENS.test(snapshot.userAgent)) return 'ios-browser';
  return isRealIOSSafari(snapshot.userAgent) ? 'ios-safari' : 'none';
}

export function parseInstallPromptState(raw: string | null): InstallPromptState {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const { offeredAt, appOfferedAt } = parsed as Record<string, unknown>;
    return {
      ...(isFiniteNumber(offeredAt) ? { offeredAt } : {}),
      ...(isFiniteNumber(appOfferedAt) ? { appOfferedAt } : {}),
    };
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
  state: InstallPromptState,
  audience: InstallAudience = 'client'
): InstallMethod {
  const method = detectInstallMethod(snapshot, audience);
  // The App Store offer has its own single ask (see InstallPromptState)
  if (method === 'app-store') return hasBeenOfferedApp(state) ? 'none' : 'app-store';
  if (hasBeenOffered(state)) return 'none';
  return method;
}
