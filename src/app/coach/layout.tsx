import { AppToaster } from '@/components/notifications/AppToaster';
import { MessageNotifications } from '@/components/notifications/MessageNotifications';

/**
 * Coach layout — wraps all /coach/* pages.
 * Bottom padding clears exactly the fixed mobile tab bar (--tabbar-h
 * + home-indicator safe area) plus a small breathing gap.
 */
export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background pb-[calc(var(--tabbar-h)+1.25rem+env(safe-area-inset-bottom))] sm:pb-0">
      {children}
      {/* Client messages announce themselves from anywhere in the coach app */}
      <MessageNotifications />
      <AppToaster />
    </div>
  );
}
