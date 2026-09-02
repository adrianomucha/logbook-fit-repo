/**
 * Deterministic avatar colour from a display name — the web's avatarColor
 * with its Tailwind pairs (rose/sky/amber/… 100 + 700) as literal colours,
 * so the same person is the same colour in both apps.
 */
const AVATAR_COLORS: { bg: string; text: string }[] = [
  { bg: '#ffe4e6', text: '#be123c' }, // rose
  { bg: '#e0f2fe', text: '#0369a1' }, // sky
  { bg: '#fef3c7', text: '#b45309' }, // amber
  { bg: '#ede9fe', text: '#6d28d9' }, // violet
  { bg: '#d1fae5', text: '#047857' }, // emerald
  { bg: '#ffedd5', text: '#c2410c' }, // orange
  { bg: '#ccfbf1', text: '#0f766e' }, // teal
  { bg: '#fce7f3', text: '#be185d' }, // pink
];

export function avatarColor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}
