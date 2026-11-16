/**
 * Links that open the native app.
 *
 * The app's routes mirror the website's client pages, so a web path the
 * server puts in a push notification, or a logbook.fit link someone taps in
 * an email, maps to a screen. This is the one copy of that mapping, and of
 * which web paths belong to the app at all (the universal links file the
 * website serves is built from the same list).
 */

/** The domain whose links the app claims (`applinks:` in mobile/app.json). */
export const APP_LINK_HOSTS = ['logbook.fit'] as const;

/** iOS bundle identifier (mobile/app.json). */
export const IOS_BUNDLE_ID = 'fit.logbook.app';

/**
 * Web paths the app opens instead of Safari: the client's own pages. Signup,
 * invites, password reset, the coach workspace and the public pages stay on
 * the web, where they live.
 */
export const UNIVERSAL_LINK_PATHS = ['/client', '/client/*'] as const;

/**
 * Where a web path lands in the app. Most pass straight through; the web's
 * `?tab=` query becomes the matching tab. Null for anything that is not a
 * path.
 */
export function appRouteForWebPath(url: unknown): string | null {
  if (typeof url !== 'string' || !url.startsWith('/')) return null;
  const [path, query = ''] = url.split('?');
  const tab = new URLSearchParams(query.split('#')[0]).get('tab');
  if (path === '/client' || path === '/client/') {
    if (tab === 'chat') return '/client/chat';
    if (tab === 'progress') return '/client/progress';
    return '/client';
  }
  // The web nests a session under its week (/client/workout/<weekId>/<dayId>);
  // the app's route is the day alone
  const workout = path.match(/^\/client\/workout\/(?:[^/]+\/)?([^/]+)\/?$/);
  if (workout) return `/client/workout/${workout[1]}`;
  if (path.startsWith('/client/checkin/')) return path;
  if (path === '/client/settings' || path === '/client/settings/') return '/client/settings';
  if (path.startsWith('/coach')) return '/coach';
  return '/client';
}

/**
 * The app route for a link the system handed the app (a universal link, as a
 * full URL or a bare path). Null when the link is not one of ours to
 * rewrite: another host, another scheme (the app's own `logbook://` links
 * already name app routes), or a path outside the client pages.
 */
export function appRouteForLink(link: string): string | null {
  let pathAndQuery: string;
  if (link.startsWith('/')) {
    pathAndQuery = link;
  } else {
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!(APP_LINK_HOSTS as readonly string[]).includes(url.hostname)) return null;
    pathAndQuery = `${url.pathname}${url.search}`;
  }
  const path = pathAndQuery.split('?')[0];
  if (path !== '/client' && !path.startsWith('/client/')) return null;
  return appRouteForWebPath(pathAndQuery);
}

/** An Apple Team ID: ten capital letters and digits. */
export function isAppleTeamId(value: string | undefined | null): value is string {
  return !!value && /^[A-Z0-9]{10}$/.test(value);
}

/**
 * The file iOS fetches from /.well-known/apple-app-site-association to
 * confirm the website agrees the app may open its links.
 */
export function appleAppSiteAssociation(teamId: string) {
  return {
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.${IOS_BUNDLE_ID}`],
          components: UNIVERSAL_LINK_PATHS.map((path) => ({ '/': path })),
        },
      ],
    },
  };
}
