'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/api-client';

/**
 * Keeps User.timezone in step with the browser's IANA timezone
 * (Intl.DateTimeFormat().resolvedOptions().timeZone), so it follows the
 * person as they travel or change devices without a settings screen. The
 * check-in scheduler reads it to anchor weekday cadences to the client's
 * local day.
 *
 * Fire-and-forget: a failed sync must never surface to the user — the
 * scheduler falls back to UTC when the stored zone is stale or missing.
 */
export function TimezoneSync() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;

    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!timezone) return;

    // Once per browser session per zone — page loads shouldn't each cost a write
    const guardKey = 'timezone-synced';
    try {
      if (sessionStorage.getItem(guardKey) === timezone) return;
    } catch {
      // Storage unavailable (private mode) — sync anyway
    }

    apiFetch('/api/account/timezone', {
      method: 'PUT',
      body: JSON.stringify({ timezone }),
    })
      .then(() => {
        try {
          sessionStorage.setItem(guardKey, timezone as string);
        } catch {
          // Best effort
        }
      })
      .catch(() => {
        // Silent — next page load retries
      });
  }, [status]);

  return null;
}
