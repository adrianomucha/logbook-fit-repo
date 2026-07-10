/**
 * Deterministic avatar color from a display name — avoids bland gray avatars.
 * Shared across coach and client surfaces so the same person renders the same
 * color everywhere (coach roster, stats-card faces, client's coach strip).
 */
const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300',
] as const;

export function avatarColor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}
