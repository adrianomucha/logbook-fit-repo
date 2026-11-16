/**
 * Spreadsheets coaches upload after booking a setup call, on Supabase
 * Storage (same project and same server-only REST approach as
 * lib/avatar-storage.ts).
 *
 * Unlike avatars, the bucket is private: these are coaches' client programs,
 * and they're only ever read by the admin through short-lived signed URLs.
 * The bucket is created on first upload, so there's no dashboard step.
 *
 * No-ops when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing: the
 * upload reports "not configured" and the coach is told to reply to their
 * invite email with the file instead.
 */

const BUCKET = "setup-files";

/** Vercel caps a function's request body at 4.5MB */
export const SETUP_FILE_MAX_BYTES = 4 * 1024 * 1024;

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export function setupFileStorageConfigured(): boolean {
  return config() !== null;
}

function authHeaders(key: string) {
  // Both headers, same value, as in avatar-storage.ts: supports both the
  // legacy JWT service_role keys and the new sb_secret_ keys.
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function createBucket(cfg: { url: string; key: string }): Promise<void> {
  const res = await fetch(`${cfg.url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...authHeaders(cfg.key), "Content-Type": "application/json" },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: false,
      file_size_limit: SETUP_FILE_MAX_BYTES,
    }),
  });
  // Another request creating it at the same moment is fine
  if (!res.ok && res.status !== 409) {
    const detail = await res.text().catch(() => "");
    if (!/already exists/i.test(detail)) {
      throw new Error(`Setup file bucket creation failed (${res.status}): ${detail.slice(0, 200)}`);
    }
  }
}

/** Store the bytes at `path` inside the private bucket. */
export async function uploadSetupFile(
  path: string,
  body: Uint8Array,
  contentType: string
): Promise<void> {
  const cfg = config();
  if (!cfg) throw new Error("Setup file storage is not configured");

  const put = () =>
    fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: {
        ...authHeaders(cfg.key),
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: Buffer.from(body),
    });

  let res = await put();
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (!/bucket not found/i.test(detail)) {
      throw new Error(`Setup file upload failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    await createBucket(cfg);
    res = await put();
    if (!res.ok) {
      const retryDetail = await res.text().catch(() => "");
      throw new Error(`Setup file upload failed (${res.status}): ${retryDetail.slice(0, 200)}`);
    }
  }
}

/** Best-effort delete of a replaced file. */
export async function deleteSetupFile(path: string | null | undefined): Promise<void> {
  const cfg = config();
  if (!cfg || !path) return;
  try {
    await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers: authHeaders(cfg.key),
    });
  } catch {
    // An orphaned file costs kilobytes; never fail the upload over it.
  }
}

/**
 * A one-minute download link for the admin, which saves the file under the
 * name the coach uploaded it with.
 */
export async function signedSetupFileUrl(
  path: string,
  downloadName: string
): Promise<string> {
  const cfg = config();
  if (!cfg) throw new Error("Setup file storage is not configured");

  const res = await fetch(`${cfg.url}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...authHeaders(cfg.key), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 60 }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Setup file signing failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${cfg.url}/storage/v1${signedURL}&download=${encodeURIComponent(downloadName)}`;
}
