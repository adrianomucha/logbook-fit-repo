import { appRouteForLink } from '@logbook/shared/app-links';

/**
 * Runs on every link the system hands the app, before the router sees it.
 *
 * A logbook.fit/client/... link (a universal link, tapped in an email or a
 * message) names a web path. The web nests a workout under its week and
 * keeps chat and progress behind a `?tab=`, so it is mapped onto the app's
 * routes here. Anything that is not one of those links passes through
 * untouched. Must never throw: a failure here would stop the app opening.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return appRouteForLink(path) ?? path;
  } catch {
    return path;
  }
}
