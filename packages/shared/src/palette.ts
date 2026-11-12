import palette from './palette.json';

/**
 * The brand palette, as literal colours. One file both apps read:
 *
 * - The native app has no CSS variables, so its Tailwind config and every
 *   colour it passes as a prop (icons, spinners, placeholders) come from here.
 * - The web app keeps its tokens as HSL variables in src/app/globals.css;
 *   src/lib/__tests__/palette.test.ts fails if the two drift apart.
 *
 * Light surfaces are plain white and neutral grey. The ink (text, solid
 * fills, dark surfaces) is the app icon's near-black, #17180f. Volt is the
 * icon's slash, and it is rationed: a screen's one main action, or a logged
 * set. Never text on a light surface.
 */
export type PaletteTheme = typeof palette.light;
export type AvatarTone = (typeof palette.avatars)[number];

export const INK = palette.ink;
export const PAPER = palette.paper;
export const VOLT = palette.volt;

/** Light theme: the only theme the native app draws. */
export const colors: PaletteTheme = palette.light;
export const darkColors: PaletteTheme = palette.dark;

/**
 * Monogram avatar tones: eight hues at one saturation and lightness, so a
 * roster reads as one set of people and not eight unrelated stickers.
 */
export const AVATAR_TONES: readonly AvatarTone[] = palette.avatars;

/** Same person, same tone, in both apps. */
export function avatarToneIndex(name: string): number {
  return (name.charCodeAt(0) || 0) % AVATAR_TONES.length;
}
