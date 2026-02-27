/**
 * Client layout — wraps all /client/* pages.
 * Provides safe bottom padding for the mobile bottom nav
 * that individual views render via ClientNav.
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      {children}
    </div>
  );
}
