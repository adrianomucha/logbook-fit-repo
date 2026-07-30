import { describe, it, expect } from "vitest";
import {
  detectInstallMethod,
  isIOS,
  isRetired,
  isRunningInstalled,
  isSnoozed,
  parseInstallPromptState,
  recordDismissal,
  resolveInstallPrompt,
  SNOOZE_DAYS,
  type BrowserSnapshot,
} from "../pwa-install";

const DAY_MS = 86_400_000;
const NOW = 1_700_000_000_000;

// Real UA strings — the whole module is pattern matching against these, so
// paraphrased ones would test nothing.
const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/115.0.5790.130 Mobile/15E148 Safari/604.1",
  iphoneFirefox:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/116.0 Mobile/15E148 Safari/605.1.15",
  iphoneEdge:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/115.0.1901.183 Mobile/15E148 Safari/605.1.15",
  // Embedded WKWebViews: no Version/ token, and usually no Safari/ token.
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 295.0.0.33.109",
  facebook:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone14,2;FBMD/iPhone]",
  whatsapp:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  // iPadOS 13+ default "desktop" mode — byte-identical to macOS Safari.
  ipadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36",
};

const snapshot = (over: Partial<BrowserSnapshot> = {}): BrowserSnapshot => ({
  userAgent: UA.iphoneSafari,
  maxTouchPoints: 5,
  navigatorStandalone: false,
  displayModeStandalone: false,
  hasNativePrompt: false,
  ...over,
});

describe("isIOS", () => {
  it("matches iPhone, iPad and iPod user agents", () => {
    expect(isIOS(UA.iphoneSafari, 5)).toBe(true);
    expect(isIOS(UA.iphoneChrome, 5)).toBe(true);
    expect(isIOS(UA.instagram, 5)).toBe(true);
  });

  it("treats a touch-capable Macintosh UA as an iPad in desktop mode", () => {
    expect(isIOS(UA.ipadDesktopMode, 5)).toBe(true);
  });

  it("does not mistake a real Mac for an iPad", () => {
    expect(isIOS(UA.macSafari, 0)).toBe(false);
  });

  it("does not match Android", () => {
    expect(isIOS(UA.androidChrome, 5)).toBe(false);
  });
});

describe("isRunningInstalled", () => {
  it("is false in a normal browser tab", () => {
    expect(
      isRunningInstalled({ navigatorStandalone: false, displayModeStandalone: false })
    ).toBe(false);
  });

  it("accepts either the iOS or the standards-based signal", () => {
    expect(
      isRunningInstalled({ navigatorStandalone: true, displayModeStandalone: false })
    ).toBe(true);
    expect(
      isRunningInstalled({ navigatorStandalone: false, displayModeStandalone: true })
    ).toBe(true);
  });
});

describe("detectInstallMethod", () => {
  it("walks iOS Safari through the Share sheet", () => {
    expect(detectInstallMethod(snapshot())).toBe("ios-safari");
  });

  it("treats an iPad in desktop mode as iOS Safari", () => {
    expect(
      detectInstallMethod(snapshot({ userAgent: UA.ipadDesktopMode, maxTouchPoints: 5 }))
    ).toBe("ios-safari");
  });

  it("uses the third-party wording for Chrome, Firefox and Edge on iOS", () => {
    for (const userAgent of [UA.iphoneChrome, UA.iphoneFirefox, UA.iphoneEdge]) {
      expect(detectInstallMethod(snapshot({ userAgent }))).toBe("ios-browser");
    }
  });

  it("stays silent in iOS in-app webviews, which have no Add to Home Screen", () => {
    for (const userAgent of [UA.instagram, UA.facebook, UA.whatsapp]) {
      expect(detectInstallMethod(snapshot({ userAgent }))).toBe("none");
    }
  });

  it("prefers the native prompt when the browser gives us one", () => {
    expect(
      detectInstallMethod(
        snapshot({ userAgent: UA.androidChrome, maxTouchPoints: 5, hasNativePrompt: true })
      )
    ).toBe("native");
  });

  it("stays silent on Android until beforeinstallprompt fires", () => {
    expect(
      detectInstallMethod(snapshot({ userAgent: UA.androidChrome, maxTouchPoints: 5 }))
    ).toBe("none");
  });

  it("stays silent on desktop Safari, which has no install path here", () => {
    expect(
      detectInstallMethod(snapshot({ userAgent: UA.macSafari, maxTouchPoints: 0 }))
    ).toBe("none");
  });

  it("never prompts inside an already-installed app", () => {
    expect(detectInstallMethod(snapshot({ navigatorStandalone: true }))).toBe("none");
    expect(detectInstallMethod(snapshot({ displayModeStandalone: true }))).toBe("none");
    // Even when Chromium offers a prompt for an app that is already installed.
    expect(
      detectInstallMethod(
        snapshot({
          userAgent: UA.androidChrome,
          displayModeStandalone: true,
          hasNativePrompt: true,
        })
      )
    ).toBe("none");
  });
});

describe("parseInstallPromptState", () => {
  it("treats missing storage as a first visit", () => {
    expect(parseInstallPromptState(null)).toEqual({});
  });

  it("reads back what recordDismissal wrote", () => {
    const written = JSON.stringify(recordDismissal({}, NOW));
    expect(parseInstallPromptState(written)).toEqual({
      dismissedAt: NOW,
      dismissCount: 1,
    });
  });

  it("falls back to a first visit on corrupt JSON rather than throwing", () => {
    expect(parseInstallPromptState("{not json")).toEqual({});
    expect(parseInstallPromptState("null")).toEqual({});
    expect(parseInstallPromptState('"a string"')).toEqual({});
  });

  it("drops fields of the wrong type", () => {
    expect(
      parseInstallPromptState('{"dismissedAt":"yesterday","dismissCount":null}')
    ).toEqual({ dismissedAt: undefined, dismissCount: undefined });
  });
});

describe("recordDismissal", () => {
  it("starts the count at one", () => {
    expect(recordDismissal({}, NOW)).toEqual({ dismissedAt: NOW, dismissCount: 1 });
  });

  it("increments an existing count and re-stamps the time", () => {
    expect(recordDismissal({ dismissedAt: 1, dismissCount: 2 }, NOW)).toEqual({
      dismissedAt: NOW,
      dismissCount: 3,
    });
  });
});

describe("isSnoozed", () => {
  it("is not snoozed before the first dismissal", () => {
    expect(isSnoozed({}, NOW)).toBe(false);
  });

  it("stays quiet for the first rung of the ladder, then asks again", () => {
    const state = { dismissedAt: NOW, dismissCount: 1 };
    expect(isSnoozed(state, NOW + SNOOZE_DAYS[0] * DAY_MS - 1)).toBe(true);
    expect(isSnoozed(state, NOW + SNOOZE_DAYS[0] * DAY_MS)).toBe(false);
  });

  it("backs off further after the second dismissal", () => {
    const state = { dismissedAt: NOW, dismissCount: 2 };
    expect(isSnoozed(state, NOW + SNOOZE_DAYS[0] * DAY_MS)).toBe(true);
    expect(isSnoozed(state, NOW + SNOOZE_DAYS[1] * DAY_MS)).toBe(false);
  });

  it("never comes back once the ladder is exhausted", () => {
    const state = { dismissedAt: NOW, dismissCount: SNOOZE_DAYS.length + 1 };
    expect(isSnoozed(state, NOW + 3650 * DAY_MS)).toBe(true);
    expect(isRetired(state)).toBe(true);
  });

  it("stays quiet when a dismissal has no usable timestamp", () => {
    expect(isSnoozed({ dismissCount: 1 }, NOW)).toBe(true);
  });

  it("does not re-show early when the device clock moves backwards", () => {
    const state = { dismissedAt: NOW, dismissCount: 1 };
    expect(isSnoozed(state, NOW - 30 * DAY_MS)).toBe(true);
  });
});

describe("resolveInstallPrompt", () => {
  it("detects normally when the user has never dismissed", () => {
    expect(resolveInstallPrompt(snapshot(), {}, NOW)).toBe("ios-safari");
  });

  it("stays silent while snoozed, even on a supported platform", () => {
    const state = recordDismissal({}, NOW);
    expect(resolveInstallPrompt(snapshot(), state, NOW + DAY_MS)).toBe("none");
  });

  it("comes back once the snooze expires", () => {
    const state = recordDismissal({}, NOW);
    expect(
      resolveInstallPrompt(snapshot(), state, NOW + SNOOZE_DAYS[0] * DAY_MS)
    ).toBe("ios-safari");
  });
});
