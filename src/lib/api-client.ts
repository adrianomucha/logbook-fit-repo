// The web's API client: same origin, cookie auth — nothing to configure.
// The client itself lives in @logbook/shared so the native app can build one
// with its own origin and bearer token.
import { createApiClient } from "@logbook/shared/api-client";

export { ApiError } from "@logbook/shared/api-client";

const client = createApiClient();

export const fetcher = client.fetcher;
export const apiFetch = client.apiFetch;
