import { Client, Message, CheckIn } from '@/types';
import { AlertCircle, Clock, MessageSquare, CheckCircle2, ClipboardCheck, LucideIcon } from 'lucide-react';

export interface ClientStatus {
  type: 'pending-checkin' | 'at-risk' | 'overdue' | 'unread' | 'ok';
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  priority: number;
  hasUnread: boolean;
  checkIn?: CheckIn;
}

/**
 * Determines a client's status based on check-ins, messages, and last check-in date.
 * Priority order (0 = highest):
 * 0. Pending check-in - Client submitted, coach needs to review
 * 1. At risk - 5-6 days since last check-in
 * 2. Check-in overdue - 7+ days since last check-in
 * 3. Unread messages - Client has sent messages
 * 4. All caught up - Everything is up to date
 */
export function getClientStatus(
  client: Client,
  messages: Message[],
  checkIns: CheckIn[]
): ClientStatus {
  const lastCheckIn = client.lastCheckInDate ? new Date(client.lastCheckInDate) : null;
  const daysSinceCheckIn = lastCheckIn
    ? Math.floor((Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const unreadMessages = messages.filter(
    (m) => m.senderId === client.id && !m.read
  ).length;

  const pendingCheckIn = checkIns?.find(
    (c) => c.clientId === client.id && c.status === 'pending'
  );

  // Priority 0: Pending check-in (highest priority)
  if (pendingCheckIn) {
    return {
      type: 'pending-checkin',
      icon: ClipboardCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      borderColor: 'border-purple-200 dark:border-purple-900',
      label: 'Check-in Ready to Review',
      priority: 0,
      hasUnread: false,
      checkIn: pendingCheckIn
    };
  }

  // Priority 1: At risk (5-6 days since check-in)
  if (daysSinceCheckIn >= 5 && daysSinceCheckIn < 7) {
    return {
      type: 'at-risk',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      borderColor: 'border-yellow-200 dark:border-yellow-900',
      label: 'At Risk',
      priority: 1,
      hasUnread: unreadMessages > 0
    };
  }

  // Priority 2: Check-in overdue (7+ days)
  if (daysSinceCheckIn >= 7) {
    return {
      type: 'overdue',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-900',
      label: 'Check-in Overdue',
      priority: 2,
      hasUnread: unreadMessages > 0
    };
  }

  // Priority 3: Unread messages
  if (unreadMessages > 0) {
    return {
      type: 'unread',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-900',
      label: `${unreadMessages} Unread`,
      priority: 3,
      hasUnread: true
    };
  }

  // Priority 4: All caught up (lowest priority, everything is good)
  return {
    type: 'ok',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-background',
    borderColor: 'border-border',
    label: 'All caught up',
    priority: 4,
    hasUnread: false
  };
}
