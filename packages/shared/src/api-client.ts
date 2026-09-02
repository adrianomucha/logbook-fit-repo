/**
 * The one way both apps talk to the API: JSON in, JSON out, and a typed
 * error carrying the HTTP status so screens can tell "sign in again" (401)
 * from "slow down" (429) from "that's gone" (404).
 *
 * Platform differences are injected, not branched on: the web passes
 * nothing (same origin, cookie auth); the native app passes its API origin
 * and a header supplier that adds the bearer token.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  /** Origin prefixed onto every relative URL, e.g. "https://logbook.fit". */
  baseUrl?: string;
  /** Extra headers for every request — the app's Authorization header. */
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
}

async function readError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({ error: "Unknown error" }));
  return new ApiError(res.status, body.error || "Request failed");
}

export function createApiClient(options: ApiClientOptions = {}) {
  const { baseUrl = "", getHeaders } = options;

  const resolve = (url: string) =>
    url.startsWith("http") ? url : `${baseUrl}${url}`;

  const headersFor = async (extra?: HeadersInit): Promise<HeadersInit> => ({
    ...(getHeaders ? await getHeaders() : {}),
    ...(extra as Record<string, string> | undefined),
  });

  /** GET as JSON — the SWR fetcher. */
  const fetcher = async <T = unknown>(url: string): Promise<T> => {
    // `no-store` is load-bearing, not hygiene: iOS Safari (and installed PWAs
    // in particular) will happily answer a repeat GET from its heuristic
    // cache, which is how a polled chat thread can sit frozen until the app
    // is closed and reopened. Native fetch ignores it harmlessly.
    const res = await fetch(resolve(url), {
      cache: "no-store",
      headers: await headersFor(),
    });
    if (!res.ok) throw await readError(res);
    return res.json();
  };

  /** Any method with a JSON body. */
  const apiFetch = async <T = unknown>(
    url: string,
    init?: RequestInit
  ): Promise<T> => {
    const res = await fetch(resolve(url), {
      cache: "no-store",
      ...init,
      headers: await headersFor({
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      }),
    });
    if (!res.ok) throw await readError(res);
    return res.json();
  };

  return { fetcher, apiFetch };
}
