import { describe, it, expect } from "vitest";
import {
  detectInstallMethod,
  hasBeenOffered,
  INSTALLED_DISPLAY_MODES,
  isIOS,
  isRunningInstalled,
  markOffered,
  matchesInstalledDisplayMode,
  parseInstallPromptState,
  resolveInstallPrompt,
  type BrowserSnapshot,
} from "../pwa-install";

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
  displayModeInstalled: false,
  hasNativePrompt: false,
  ...over,
});

/** Stands in for `window.matchMedia`, matching only the modes listed. */
const matcherFor = (...active: string[]) => (query: string) =>
  active.some((mode) => query === `(display-mode: ${mode})`);

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

describe("matchesInstalledDisplayMode", () => {
  it("is false in a browser tab, where only `browser` matches", () => {
    expect(matchesInstalledDisplayMode(matcherFor("browser"))).toBe(false);
  });

  it("catches every display mode an installed launch can report", () => {
    for (const mode of INSTALLED_DISPLAY_MODES) {
      expect(matchesInstalledDisplayMode(matcherFor(mode))).toBe(true);
    }
  });

  it("covers the modes a manifest can land on beyond plain standalone", () => {
    // The manifest asks for `standalone`, but the platform decides. Guard
    // against a future manifest change silently re-enabling the banner
    // inside the installed app.
    expect(INSTALLED_DISPLAY_MODES).toContain("fullscreen");
    expect(INSTALLED_DISPLAY_MODES).toContain("minimal-ui");
    expect(INSTALLED_DISPLAY_MODES).toContain("window-controls-overlay");
  });
});

describe("isRunningInstalled", () => {
  it("is false in a normal browser tab", () => {
    expect(
      isRunningInstalled({ navigatorStandalone: false, displayModeInstalled: false })
    ).toBe(false);
  });

  it("accepts either the iOS or the standards-based signal", () => {
    expect(
      isRunningInstalled({ navigatorStandalone: true, displayModeInstalled: false })
    ).toBe(true);
    expect(
      isRunningInstalled({ navigatorStandalone: false, displayModeInstalled: true })
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
    expect(detectInstallMethod(snapshot({ displayModeInstalled: true }))).toBe("none");
    // Even when Chromium offers a prompt for an app that is already installed.
    expect(
      detectInstallMethod(
        snapshot({
          userAgent: UA.androidChrome,
          displayModeInstalled: true,
          hasNativePrompt: true,
        })
      )
    ).toBe("none");
  });

  it("stays silent inside the installed app under any launch display mode", () => {
    for (const mode of INSTALLED_DISPLAY_MODES) {
      const displayModeInstalled = matchesInstalledDisplayMode(matcherFor(mode));
      // Every platform we support, launched from its home screen / dock.
      for (const userAgent of [UA.iphoneSafari, UA.iphoneChrome, UA.androidChrome]) {
        expect(detectInstallMethod(snapshot({ userAgent, displayModeInstalled }))).toBe(
          "none"
        );
      }
    }
  });

  it("stays silent on Chromium with the app installed, because no event fires", () => {
    // Chrome withholds `beforeinstallprompt` once the app is installed, so an
    // installed user browsing a normal tab resolves to none without needing
    // getInstalledRelatedApps().
    expect(
      detectInstallMethod(
        snapshot({
          userAgent: UA.androidChrome,
          maxTouchPoints: 5,
          displayModeInstalled: false,
          hasNativePrompt: false,
        })
      )
    ).toBe("none");
  });
});

describe("parseInstallPromptState", () => {
  it("treats missing storage as a device that has never been asked", () => {
    expect(parseInstallPromptState(null)).toEqual({});
  });

  it("reads back what markOffered wrote", () => {
    expect(parseInstallPromptState(JSON.stringify(markOffered(NOW)))).toEqual({
      offeredAt: NOW,
    });
  });

  it("falls back to never-asked on corrupt JSON rather than throwing", () => {
    expect(parseInstallPromptState("{not json")).toEqual({});
    expect(parseInstallPromptState("null")).toEqual({});
    expect(parseInstallPromptState('"a string"')).toEqual({});
  });

  it("ignores an offeredAt of the wrong type", () => {
    expect(parseInstallPromptState('{"offeredAt":"yesterday"}')).toEqual({});
    expect(parseInstallPromptState('{"offeredAt":null}')).toEqual({});
  });
});

describe("hasBeenOffered", () => {
  it("is false before the banner has ever reached the screen", () => {
    expect(hasBeenOffered({})).toBe(false);
  });

  it("is true once a record exists, whatever the user did about it", () => {
    expect(hasBeenOffered(markOffered(NOW))).toBe(true);
  });

  it("treats an unusable timestamp as never offered", () => {
    expect(hasBeenOffered({ offeredAt: Number.NaN })).toBe(false);
  });
});

describe("resolveInstallPrompt", () => {
  it("offers on a supported platform that has not been asked", () => {
    expect(resolveInstallPrompt(snapshot(), {})).toBe("ios-safari");
  });

  it("never asks a second time, whichever way the first ask ended", () => {
    // Install, close, or ignore — all three leave the same record behind.
    const spent = parseInstallPromptState(JSON.stringify(markOffered(NOW)));
    expect(resolveInstallPrompt(snapshot(), spent)).toBe("none");
  });

  it("stays spent on the native path too", () => {
    expect(
      resolveInstallPrompt(
        snapshot({
          userAgent: UA.androidChrome,
          maxTouchPoints: 5,
          hasNativePrompt: true,
        }),
        markOffered(NOW)
      )
    ).toBe("none");
  });

  it("re-offers when the stored record is unreadable", () => {
    expect(resolveInstallPrompt(snapshot(), parseInstallPromptState("{oops"))).toBe(
      "ios-safari"
    );
  });
});
