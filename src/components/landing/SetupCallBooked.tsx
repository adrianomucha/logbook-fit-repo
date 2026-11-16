'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Check, Loader2, Upload } from 'lucide-react';
import { formatCallTime } from '@/lib/setup-call';
import { SETUP_FILE_ASK, SETUP_FILE_FALLBACK } from '@/lib/landing-copy';

export interface SetupCallBooking {
  /** Cal.com's booking uid: the upload's proof of booking */
  uid: string | null;
  /** ISO start time */
  startTime: string;
}

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = '.xlsx,.xlsm,.xls,.ods,.numbers,.csv,.tsv';

// The Cal.com webhook that records the booking can land a few seconds after
// the widget reports it, and the upload needs that record. Retry a "booking
// not found" for about 15 seconds before giving up.
const RETRY_DELAYS_MS = [1500, 2500, 4000, 7000];

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'done'; fileName: string }
  | { kind: 'error'; message: string };

async function putFile(file: File, uid: string): Promise<Response> {
  return fetch('/api/waitlist/setup-file', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Booking-Uid': uid,
      'X-File-Name': encodeURIComponent(file.name),
    },
    body: file,
  });
}

/**
 * The confirmation card once the setup call is booked: when it is, that the
 * invite is on its way, and a place to upload the spreadsheet the coach
 * coaches from so the import can be done before the call.
 */
export function SetupCallBooked({
  header,
  email,
  booking,
}: {
  header: ReactNode;
  email: string;
  booking: SetupCallBooking;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<UploadState>({ kind: 'idle' });

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const when = formatCallTime(new Date(booking.startTime), timeZone);

  const send = async (file: File) => {
    if (!booking.uid) return;
    if (file.size > MAX_BYTES) {
      setUpload({ kind: 'error', message: 'Choose a file under 4MB.' });
      return;
    }
    setUpload({ kind: 'uploading' });
    try {
      let res = await putFile(file, booking.uid);
      for (const delay of RETRY_DELAYS_MS) {
        if (res.status !== 404) break;
        await new Promise((resolve) => setTimeout(resolve, delay));
        res = await putFile(file, booking.uid);
      }
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setUpload({ kind: 'done', fileName: body?.fileName ?? file.name });
        return;
      }
      setUpload({
        kind: 'error',
        message:
          res.status === 400 || res.status === 413 || res.status === 429
            ? `${body?.error ?? 'That file didn’t upload'}.`
            : 'That didn’t upload.',
      });
    } catch {
      setUpload({ kind: 'error', message: 'That didn’t upload.' });
    }
  };

  return (
    <div
      role="status"
      className="overflow-hidden rounded-2xl bg-brand text-left text-brand-foreground animate-fade-in-up"
    >
      <div className="p-6 sm:p-7">
        {header}
        <p className="mt-4 text-sm leading-relaxed text-brand-foreground/80 antialiased">
          Your setup call is on{' '}
          <strong className="font-semibold text-brand-foreground">{when}</strong>. Your
          invite is on its way to {email}: create your account before the call.
        </p>

        <div className="mt-5 border-t border-brand-foreground/20 pt-5">
          {upload.kind === 'done' ? (
            <p className="flex items-start gap-2 text-sm font-medium antialiased">
              <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />
              <span>
                Got <span className="break-all">{upload.fileName}</span>. We’ll have it
                imported before the call.
              </span>
            </p>
          ) : (
            <>
              <p className="text-sm font-medium antialiased">{SETUP_FILE_ASK}</p>
              {booking.uid && (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPT}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) send(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={upload.kind === 'uploading'}
                    onClick={() => inputRef.current?.click()}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-brand-foreground/30 px-4 font-mono text-xs font-medium uppercase tracking-[0.08em] antialiased transition-[color,background-color,border-color,transform] duration-150 ease-out-strong hover:border-brand-foreground hover:bg-brand-foreground hover:text-brand active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60"
                  >
                    {upload.kind === 'uploading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="h-4 w-4" aria-hidden="true" />
                    )}
                    {upload.kind === 'uploading' ? 'Uploading' : 'Upload spreadsheet'}
                  </button>
                </>
              )}
              {upload.kind === 'error' && (
                <p className="mt-2 text-sm font-medium antialiased">{upload.message}</p>
              )}
              <p className="mt-2 text-xs text-brand-foreground/60 antialiased">
                {SETUP_FILE_FALLBACK}
              </p>
            </>
          )}
        </div>
      </div>
      <p className="bg-brand-foreground px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-brand antialiased sm:px-7">
        Invite sent · See you on the call
      </p>
    </div>
  );
}
