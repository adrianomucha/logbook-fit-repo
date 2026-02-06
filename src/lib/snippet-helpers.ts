import { Client, AppState } from '@/types';
import { ClientStatus } from '@/lib/client-status';

export function getClientSnippet(
  client: Client,
  status: ClientStatus,
  appState: AppState
): string | undefined {
  switch (status.type) {
    case 'pending-checkin':
      if (status.checkIn?.clientNotes) {
        return truncate(status.checkIn.clientNotes, 100);
      }
      if (status.checkIn?.notes) {
        return truncate(status.checkIn.notes, 100);
      }
      break;

    case 'unread':
      const latestUnread = appState.messages
        .filter(m => m.senderId === client.id && !m.read)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      return latestUnread ? truncate(latestUnread.content, 100) : undefined;

    case 'at-risk':
    case 'overdue':
      const days = Math.floor(
        (Date.now() - new Date(client.lastCheckInDate!).getTime()) / (1000 * 60 * 60 * 24)
      );
      return `Last check-in was ${days} days ago`;

    default:
      return undefined;
  }
}

function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}
