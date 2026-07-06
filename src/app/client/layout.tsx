import { Toaster } from 'sonner';

/**
 * Client layout — wraps all /client/* pages.
 * No bottom padding here: each view provides its own clearance for the
 * bars it actually renders (dashboard → tab bar, workout → finish bar).
 * A blanket layout pad would put dead space under every page.
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      {children}
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
