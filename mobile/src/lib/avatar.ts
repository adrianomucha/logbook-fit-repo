import { ApiError } from '@logbook/shared/api-client';
import { API_URL } from './config';
import { apiFetch } from './api';
import { currentToken } from './session-store';

/** Server-side cap (AVATAR_MAX_BYTES in the web's avatar-storage). */
export const AVATAR_MAX_BYTES = 4 * 1024 * 1024;

/**
 * PUT /api/account/avatar with the raw image bytes — not JSON, so this one
 * request bypasses the shared client. The server sniffs the real type from
 * the bytes; the content-type header is a courtesy.
 */
export async function uploadAvatar(localUri: string): Promise<string> {
  const blob = await (await fetch(localUri)).blob();
  if (blob.size > AVATAR_MAX_BYTES) throw new ApiError(413, 'Choose an image under 4MB');

  const token = currentToken();
  const res = await fetch(`${API_URL}/api/account/avatar`, {
    method: 'PUT',
    body: blob,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': blob.type || 'application/octet-stream',
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error || 'Upload failed');
  }
  const data = (await res.json()) as { avatarUrl: string };
  return data.avatarUrl;
}

/** DELETE /api/account/avatar — back to the monogram. */
export async function removeAvatar(): Promise<void> {
  await apiFetch('/api/account/avatar', { method: 'DELETE' });
}
