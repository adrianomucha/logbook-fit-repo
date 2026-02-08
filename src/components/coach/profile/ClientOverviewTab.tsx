import { useMemo } from 'react';
import { Client, CompletedWorkout, WorkoutPlan, CheckIn } from '@/types';
import { ClientStatus } from '@/lib/client-status';
import { getWeeklyActivity } from '@/lib/client-activity';
import { CheckInStatusCard } from './overview/CheckInStatusCard';
import { AtRiskExplanationCard } from './overview/AtRiskExplanationCard';
import { LastCheckInSnippet } from './overview/LastCheckInSnippet';
import { WeeklyActivityCard } from './overview/WeeklyActivityCard';

interface ClientOverviewTabProps {
  client: Client;
  plan?: WorkoutPlan;
  completedWorkouts: CompletedWorkout[];
  checkIns: CheckIn[];
  status: ClientStatus;
  onSwitchToMessages: () => void;
  onStartCheckIn: () => void;
}

export function ClientOverviewTab({
  client,
  plan,
  completedWorkouts,
  checkIns,
  status,
  onSwitchToMessages,
  onStartCheckIn
}: ClientOverviewTabProps) {
  const daysSinceCheckIn = useMemo(() => {
    if (!client.lastCheckInDate) return 999;
    return Math.floor((Date.now() - new Date(client.lastCheckInDate).getTime()) / (1000 * 60 * 60 * 24));
  }, [client.lastCheckInDate]);

  const weeklyActivity = useMemo(
    () => getWeeklyActivity(client, plan, completedWorkouts),
    [client, plan, completedWorkouts]
  );

  const showAtRiskExplanation = status.type === 'at-risk' || status.type === 'overdue';

  const lastCompletedCheckIn = useMemo(() => {
    return checkIns
      .filter(c => c.clientId === client.id && c.status === 'completed' && (c.clientNotes || c.notes))
      .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime())[0] || null;
  }, [checkIns, client.id]);

  return (
    <div className="space-y-4">
      {/* Hero: Check-in Status */}
      <CheckInStatusCard
        client={client}
        status={status}
        daysSinceCheckIn={daysSinceCheckIn}
        checkIns={checkIns}
        onStartCheckIn={onStartCheckIn}
        onReviewCheckIn={onStartCheckIn}  // Same flow for now
        onSendMessage={onSwitchToMessages}
      />

      {/* At-Risk Explanation (conditional) */}
      {showAtRiskExplanation && (
        <AtRiskExplanationCard
          client={client}
          daysSinceCheckIn={daysSinceCheckIn}
        />
      )}

      {/* Last check-in sentiment snippet */}
      {lastCompletedCheckIn && (
        <LastCheckInSnippet checkIn={lastCompletedCheckIn} clientName={client.name} />
      )}

      {/* This Week's Activity - full width */}
      <WeeklyActivityCard
        client={client}
        plan={plan}
        weeklyActivity={weeklyActivity}
      />
    </div>
  );
}
