/**
 * Handing someone from the native app over to the website.
 *
 * The native app opens a few web pages in an in-app browser sheet (the coach
 * workspace, password reset, the legal pages). On iOS that sheet reports the
 * same user agent as Safari, so the website cannot tell it apart on its own
 * and would offer "Add to Home Screen" to someone who already has the real
 * app. The app therefore tags every link it opens, and the website reads the
 * tag back.
 */

export const FROM_APP_PARAM = 'from';
export const FROM_APP_VALUE = 'app';

/** Tags a web URL as opened by the native app. Keeps any existing query and hash. */
export function withFromApp(url: string): string {
  const hashAt = url.indexOf('#');
  const base = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : url.slice(hashAt);
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${FROM_APP_PARAM}=${FROM_APP_VALUE}${hash}`;
}

/** True when a `location.search` string carries the native app's tag. */
export function isFromApp(search: string): boolean {
  return new URLSearchParams(search).get(FROM_APP_PARAM) === FROM_APP_VALUE;
}
