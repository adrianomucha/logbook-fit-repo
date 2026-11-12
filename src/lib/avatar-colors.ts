import { avatarToneIndex } from '@logbook/shared/palette';

/**
 * Deterministic avatar color from a display name. Shared across coach and
 * client surfaces so the same person renders the same color everywhere
 * (coach roster, stats-card faces, client's coach strip).
 *
 * Eight hues at one saturation and lightness, from @logbook/shared/palette,
 * so a roster reads as one set of people. Tailwind only emits classes it can
 * see as literals, so the hex values are written out here; palette.test.ts
 * fails if they stop matching the shared palette the native app reads.
 */
export const AVATAR_CLASSES = [
  'bg-[#ecddd9] text-[#5e3026] dark:bg-[#352522] dark:text-[#dcb5ad]', // clay
  'bg-[#ecd9de] text-[#5e2634] dark:bg-[#352227] dark:text-[#dcadb9]', // rose
  'bg-[#ecd9e9] text-[#5e2655] dark:bg-[#352232] dark:text-[#dcadd4]', // plum
  'bg-[#ddd9ec] text-[#30265e] dark:bg-[#252235] dark:text-[#b5addc]', // iris
  'bg-[#d9e2ec] text-[#26405e] dark:bg-[#222b35] dark:text-[#adc3dc]', // slate
  'bg-[#d9e9ec] text-[#26555e] dark:bg-[#223235] dark:text-[#add4dc]', // sky
  'bg-[#d9ece6] text-[#265e4c] dark:bg-[#22352f] dark:text-[#addccc]', // pine
  'bg-[#dbecd9] text-[#2b5e26] dark:bg-[#233522] dark:text-[#b1dcad]', // moss
] as const;

export function avatarColor(name: string) {
  return AVATAR_CLASSES[avatarToneIndex(name)];
}
