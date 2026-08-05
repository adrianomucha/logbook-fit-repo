import { Toaster } from 'sonner';
import { MessageNotifications } from '@/components/notifications/MessageNotifications';

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
      {/* New messages announce themselves from any tab, not just the chat */}
      <MessageNotifications />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
