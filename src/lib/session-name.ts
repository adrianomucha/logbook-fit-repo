/**
 * Split a coach-authored session name into typographic roles:
 * a "Day N —" prefix is metadata (goes to the eyebrow), and a trailing
 * "(...)" is a subtitle trapped in parentheses. "Day 1 — Chest + Lats
 * (Posture Focus)" → day "1", title "Chest + Lats", subtitle "Posture Focus".
 * Names without these patterns pass through untouched.
 */
export function parseSessionName(rawName: string): {
  day?: string;
  title: string;
  subtitle?: string;
} {
  let title = rawName.trim();
  let day: string | undefined;
  let subtitle: string | undefined;

  const dayMatch = title.match(/^day\s*(\d+)\s*[—–:-]\s*(.\S.*)$/i);
  if (dayMatch) {
    day = dayMatch[1];
    title = dayMatch[2].trim();
  }

  const parenMatch = title.match(/^(.*\S)\s*\(([^()]{2,40})\)$/);
  if (parenMatch) {
    title = parenMatch[1];
    subtitle = parenMatch[2];
  }

  return { day, title, subtitle };
}
