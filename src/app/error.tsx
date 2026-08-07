'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-client-error';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold">Something went wrong</h2>
        {/* No error.message here: server errors arrive scrubbed, but a
            client-side throw would surface raw internals to the user. The
            digest is the safe breadcrumb — it matches the server log line. */}
        <p className="text-muted-foreground text-sm">
          The error has been reported.
          {error.digest ? ` Reference: ${error.digest}` : ''}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
