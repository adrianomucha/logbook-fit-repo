'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-client-error';
import { CRASH_COPY } from '@logbook/shared/state-copy';
import { StateView } from '@/components/states/StateView';

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
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      {/* No error.message here: server errors arrive scrubbed, but a
          client-side throw would surface raw internals to the user. The
          digest is the safe breadcrumb: it matches the server log line. */}
      <StateView
        art={CRASH_COPY.art}
        title={CRASH_COPY.title}
        tail={CRASH_COPY.tail}
        body={error.digest ? CRASH_COPY.reference(error.digest) : undefined}
      >
        <button
          onClick={() => reset()}
          className="inline-flex items-center h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-[0.97] transition-transform duration-150"
        >
          {CRASH_COPY.retry}
        </button>
      </StateView>
    </div>
  );
}
