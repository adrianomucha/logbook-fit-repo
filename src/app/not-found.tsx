import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold">Page Not Found</h2>
        <p className="text-muted-foreground text-sm">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
