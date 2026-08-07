import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/** Longest word pair we are willing to glue together (chars). */
const WIDOW_PAIR_LIMIT = 18;

/**
 * Ties the last two words together with a non-breaking space so a block of
 * text never ends on a lone word.
 *
 * `text-wrap: pretty` does this natively, but only on browsers that have it
 * and only as a hint — our copy is interpolated (client names, plan names),
 * so the line breaks are not knowable at design time. This is the
 * deterministic floor under the CSS.
 *
 * Left alone when the pair is long enough that gluing it could push a narrow
 * column into an overflow — and a long trailing word does not read as a
 * widow in the first place.
 */
export function noWidows(text: string, pairLimit = WIDOW_PAIR_LIMIT): string {
  const trimmed = text.trimEnd();
  const lastBreak = trimmed.lastIndexOf(' ');
  if (lastBreak === -1) return text;

  const pairStart = trimmed.lastIndexOf(' ', lastBreak - 1) + 1;
  if (trimmed.length - pairStart > pairLimit) return text;

  return trimmed.slice(0, lastBreak) + '\u00A0' + trimmed.slice(lastBreak + 1);
}
