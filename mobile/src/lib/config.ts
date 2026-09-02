/** Where the API lives. See .env.example; production when unset. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://logbook.fit').replace(/\/$/, '');

/** The web app, for the few things that stay there (coach workspace, password reset). */
export const WEB_URL = API_URL;
