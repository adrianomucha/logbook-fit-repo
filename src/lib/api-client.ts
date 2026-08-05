export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  // `no-store` is load-bearing, not hygiene: iOS Safari (and installed PWAs
  // in particular) will happily answer a repeat GET from its heuristic cache,
  // which is how a polled chat thread can sit frozen until the app is closed
  // and reopened.
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(res.status, body.error || "Request failed");
  }
  return res.json();
};

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(res.status, body.error || "Request failed");
  }
  return res.json();
}
