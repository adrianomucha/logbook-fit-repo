import { createApiClient } from '@logbook/shared/api-client';
import { API_URL } from './config';
import { currentToken } from './session-store';

export { ApiError } from '@logbook/shared/api-client';

/**
 * The same client the web uses (@logbook/shared), pointed at the API origin
 * and carrying the bearer token. Every hook and screen goes through this.
 */
export const api = createApiClient({
  baseUrl: API_URL,
  getHeaders: (): Record<string, string> => {
    const token = currentToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const { fetcher, apiFetch } = api;
