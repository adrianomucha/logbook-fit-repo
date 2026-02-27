'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-foreground text-background rounded-lg"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
