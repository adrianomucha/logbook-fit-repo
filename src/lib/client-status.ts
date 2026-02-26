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
 * Priority order (0 = highest urgency):
 * 0. At risk - 5-6 days since last check-in (coach must act NOW)
 * 1. Check-in overdue - 7+ days since last check-in
 * 2. Pending check-in - Client submitted, coach needs to review
 * 3. Unread messages - Client has sent messages
 * 4. All caught up - Everything is up to date (NO action needed)
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

  // Find check-in where client has responded (coach needs to review)
  const respondedCheckIn = checkIns?.find(
    (c) => c.clientId === client.id && c.status === 'responded'
  );

  // Priority 0: At risk (5-6 days since check-in) — most urgent, coach must act
  if (daysSinceCheckIn >= 5 && daysSinceCheckIn < 7) {
    return {
      type: 'at-risk',
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-muted/50',
      borderColor: 'border-border',
      label: 'At Risk',
      priority: 0,
      hasUnread: unreadMessages > 0
    };
  }

  // Priority 1: Check-in overdue (7+ days)
  if (daysSinceCheckIn >= 7) {
    return {
      type: 'overdue',
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-muted/50',
      borderColor: 'border-border',
      label: 'Check-in Overdue',
      priority: 1,
      hasUnread: unreadMessages > 0
    };
  }

  // Priority 2: Client responded to check-in, coach needs to review
  if (respondedCheckIn) {
    return {
      type: 'pending-checkin',
      icon: ClipboardCheck,
      color: 'text-info',
      bgColor: 'bg-muted/50',
      borderColor: 'border-border',
      label: 'Check-in Ready to Review',
      priority: 2,
      hasUnread: false,
      checkIn: respondedCheckIn
    };
  }

  // Priority 3: Unread messages
  if (unreadMessages > 0) {
    return {
      type: 'unread',
      icon: MessageSquare,
      color: 'text-info',
      bgColor: 'bg-muted/50',
      borderColor: 'border-border',
      label: `${unreadMessages} Unread`,
      priority: 3,
      hasUnread: true
    };
  }

  // Priority 4: All caught up — NO action needed
  return {
    type: 'ok',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-background',
    borderColor: 'border-border',
    label: 'All caught up',
    priority: 4,
    hasUnread: false
  };
}
