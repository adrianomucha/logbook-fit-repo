import { withFromApp } from '@logbook/shared/app-handoff';

/** Where the API lives. See .env.example; production when unset. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://logbook.fit').replace(/\/$/, '');

/** The web app, for the few things that stay there (coach workspace, password reset). */
export const WEB_URL = API_URL;

/**
 * A web page to open from inside the app. Tagged so the website knows the
 * visitor already has the app and does not offer its Home Screen install.
 */
export function webUrl(path: string): string {
  return withFromApp(`${WEB_URL}${path}`);
}
