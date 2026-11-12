import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { AVATAR_TONES, colors, darkColors, type PaletteTheme } from "@logbook/shared/palette";
import { AVATAR_CLASSES } from "@/lib/avatar-colors";

/**
 * The web keeps its colour tokens as HSL variables (globals.css); the native
 * app reads literal hex from @logbook/shared/palette. These tests are what
 * stops the two from drifting: change one side only and this fails.
 */

const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("\n  }", start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%;/g)) {
    vars[m[1]] = hslToHex(Number(m[2]), Number(m[3]), Number(m[4]));
  }
  return vars;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe.each([
  ["light", ":root", colors],
  ["dark", ".dark", darkColors],
] as [string, string, PaletteTheme][])("%s theme", (_name, selector, theme) => {
  const vars = block(selector);

  it("matches the CSS variables the web app draws with", () => {
    for (const [key, hex] of Object.entries(theme)) {
      // `faint` is native-only: the web fades muted-foreground with opacity
      if (key === "faint") continue;
      expect(vars[kebab(key)], `--${kebab(key)}`).toBe(hex);
    }
  });

  it("keeps text readable on every surface it sits on (WCAG AA)", () => {
    for (const surface of [theme.background, theme.card, theme.muted]) {
      for (const text of [theme.foreground, theme.mutedForeground, theme.destructiveText, theme.successText, theme.warningText]) {
        expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps the label on each filled surface readable", () => {
    expect(contrast(theme.primaryForeground, theme.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.brandForeground, theme.brand)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.destructiveForeground, theme.destructive)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.successForeground, theme.success)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.warningForeground, theme.warning)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.infoForeground, theme.info)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("avatar tones", () => {
  it("are the same colours on the web as in the native app", () => {
    expect(AVATAR_CLASSES).toHaveLength(AVATAR_TONES.length);
    AVATAR_TONES.forEach((tone, i) => {
      expect(AVATAR_CLASSES[i]).toBe(
        `bg-[${tone.bg}] text-[${tone.text}] dark:bg-[${tone.bgDark}] dark:text-[${tone.textDark}]`
      );
    });
  });

  it("keep the monogram readable in both themes", () => {
    for (const tone of AVATAR_TONES) {
      expect(contrast(tone.text, tone.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tone.textDark, tone.bgDark)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
