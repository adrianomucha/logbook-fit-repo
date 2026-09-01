/**
 * Avatar storage on Supabase Storage (same project as the database).
 *
 * Plain REST against the Storage API — the app talks to Supabase only from
 * the server with the service-role key, so no client SDK, no storage RLS
 * policies, and NextAuth stays the only auth system. The `avatars` bucket
 * is public-read with a 4MB limit and an image-only MIME allowlist enforced
 * bucket-side too.
 *
 * Like Web Push, the feature no-ops when its env vars are missing: uploads
 * report "not configured" and everything else keeps working.
 */

const BUCKET = "avatars";

export const AVATAR_MAX_BYTES = 4 * 1024 * 1024;

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export function avatarStorageConfigured(): boolean {
  return config() !== null;
}

/**
 * Upload the bytes and return the public CDN URL to store on User.avatarUrl.
 * Paths are versioned (timestamped) by the caller, so the CDN never serves
 * a stale cached photo after a replace.
 */
export async function uploadAvatar(
  path: string,
  body: Uint8Array,
  contentType: string
): Promise<string> {
  const cfg = config();
  if (!cfg) throw new Error("Avatar storage is not configured");

  const res = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: Buffer.from(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Avatar upload failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  return `${cfg.url}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * Best-effort delete of a previously stored avatar, given the public URL we
 * saved. URLs outside this project's avatars bucket are ignored, so a
 * legacy externally-hosted avatarUrl can never make us fire deletes at
 * arbitrary hosts.
 */
export async function deleteAvatarByUrl(publicUrl: string | null | undefined): Promise<void> {
  const cfg = config();
  if (!cfg || !publicUrl) return;

  const prefix = `${cfg.url}/storage/v1/object/public/${BUCKET}/`;
  if (!publicUrl.startsWith(prefix)) return;
  const path = publicUrl.slice(prefix.length);
  if (!path) return;

  try {
    await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${cfg.key}` },
    });
  } catch {
    // Cleanup only — an orphaned file costs kilobytes, a failed upload flow
    // costs the user their photo. Never let the delete break the request.
  }
}
