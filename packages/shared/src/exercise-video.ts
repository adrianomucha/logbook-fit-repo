/**
 * Demo videos. A coach pastes a link (YouTube, Instagram, their own site) on
 * a library exercise, once; every workout that uses the exercise shows it
 * to the client as "Watch demo", in the browser or the phone's own app.
 * We store a link, not a file — coaches already have these clips posted.
 */

export const EXERCISE_VIDEO_URL_MAX = 500;

export const EXERCISE_VIDEO_COPY = {
  /** The client's link on an expanded exercise. */
  watch: 'Watch demo',
  /** The coach's field in the exercise editor. */
  fieldLabel: 'Demo video',
  placeholder: 'Paste a YouTube or Instagram link',
  /** Under the field: the link belongs to the exercise, not this one day. */
  hint: (exerciseName: string) =>
    `Clients see this on every workout with ${exerciseName.trim() || 'this exercise'}.`,
  invalid: 'Use a full web link, like https://youtu.be/…',
} as const;

export type VideoUrlResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

// A host with a dot, then anything without spaces. Deliberately loose: the
// point is "this opens as a web page", not policing which sites coaches use.
const WEB_LINK = /^https?:\/\/[^\s/?#.]+(\.[^\s/?#.]+)+([/?#]\S*)?$/i;

/**
 * The coach's typed link → what we store. Blank clears it (null). A link
 * pasted without a scheme ("youtu.be/abc") gets https://. Anything that
 * isn't an http(s) web link is refused, so a stored link can never be a
 * javascript: or app-scheme URL when the client taps it.
 */
export function parseVideoUrl(input: string): VideoUrlResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, url: null };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (withScheme.length > EXERCISE_VIDEO_URL_MAX || !WEB_LINK.test(withScheme)) {
    return { ok: false, error: EXERCISE_VIDEO_COPY.invalid };
  }
  return { ok: true, url: withScheme };
}

const SOURCES: [RegExp, string][] = [
  [/(^|\.)(youtube\.com|youtu\.be)$/i, 'YouTube'],
  [/(^|\.)instagram\.com$/i, 'Instagram'],
  [/(^|\.)tiktok\.com$/i, 'TikTok'],
  [/(^|\.)vimeo\.com$/i, 'Vimeo'],
];

/** "YouTube" for a youtu.be link — tells the client where the tap goes. Null for other sites. */
export function videoSourceLabel(url: string): string | null {
  const host = url.match(/^https?:\/\/([^/?#:]+)/i)?.[1];
  if (!host) return null;
  return SOURCES.find(([pattern]) => pattern.test(host))?.[1] ?? null;
}
