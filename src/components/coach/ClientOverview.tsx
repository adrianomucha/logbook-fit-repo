import { Client, CompletedWorkout, Measurement, Message, WorkoutPlan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  MessageSquare,
  Ruler,
  Calendar,
  Target,
  Flame
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ClientOverviewProps {
  client: Client;
  plan?: WorkoutPlan;
  measurements: Measurement[];
  completedWorkouts: CompletedWorkout[];
  messages: Message[];
  onViewPlans: () => void;
  onViewProgress: () => void;
  onViewChat: () => void;
}

export function ClientOverview({
  client,
  plan,
  measurements,
  completedWorkouts,
  messages,
  onViewPlans,
  onViewProgress,
  onViewChat
}: ClientOverviewProps) {
  const clientMeasurements = measurements
    .filter((m) => m.clientId === client.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const clientWorkouts = completedWorkouts
    .filter((w) => w.clientId === client.id)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5);

  const unreadMessages = messages.filter(
    (m) => m.senderId === client.id && !m.read
  );

  const latestMeasurement = clientMeasurements[0];
  const previousMeasurement = clientMeasurements[1];

  const getTrend = (current?: number, prev?: number) => {
    if (!current || !prev) return null;
    const diff = current - prev;
    if (Math.abs(diff) < 0.1) return { icon: Minus, text: 'No change', color: 'text-muted-foreground' };
    if (diff > 0) return { icon: TrendingUp, text: `+${diff.toFixed(1)}`, color: 'text-green-600' };
    return { icon: TrendingDown, text: diff.toFixed(1), color: 'text-red-600' };
  };

  const weightTrend = getTrend(latestMeasurement?.weight, previousMeasurement?.weight);
  const bodyFatTrend = getTrend(latestMeasurement?.bodyFat, previousMeasurement?.bodyFat);

  const getAdherenceColor = (rate?: number) => {
    if (!rate) return 'secondary';
    if (rate >= 80) return 'default';
    if (rate >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-4">
      {/* Client Stats Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{client.avatar}</div>
              <div>
                <CardTitle>{client.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{client.email}</p>
              </div>
            </div>
            <Badge variant={getAdherenceColor(client.adherenceRate)}>
              {client.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Adherence</p>
                <p className="text-lg font-bold">{client.adherenceRate || 0}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Last Workout</p>
                <p className="text-sm font-medium">
                  {client.lastWorkoutDate
                    ? formatDistanceToNow(new Date(client.lastWorkoutDate), { addSuffix: true })
                    : 'Never'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Current Plan</p>
                <p className="text-sm font-medium">{plan?.name || 'No plan'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Latest Measurements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Latest Measurements</CardTitle>
              <Button variant="ghost" size="sm" onClick={onViewProgress}>
                <Ruler className="w-4 h-4 mr-1" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {latestMeasurement ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(latestMeasurement.date), 'MMM d, yyyy')}
                </p>
                {latestMeasurement.weight && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Weight</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{latestMeasurement.weight} lbs</span>
                      {weightTrend && (
                        <div className={`flex items-center gap-1 text-xs ${weightTrend.color}`}>
                          <weightTrend.icon className="w-3 h-3" />
                          <span>{weightTrend.text}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {latestMeasurement.bodyFat && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Body Fat</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{latestMeasurement.bodyFat}%</span>
                      {bodyFatTrend && (
                        <div className={`flex items-center gap-1 text-xs ${bodyFatTrend.color}`}>
                          <bodyFatTrend.icon className="w-3 h-3" />
                          <span>{bodyFatTrend.text}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {latestMeasurement.waist && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Waist</span>
                    <span className="font-bold">{latestMeasurement.waist}"</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No measurements recorded yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Messages Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Messages</CardTitle>
              <Button variant="ghost" size="sm" onClick={onViewChat}>
                <MessageSquare className="w-4 h-4 mr-1" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {unreadMessages.length > 0 ? (
              <div className="space-y-2">
                <Badge variant="destructive" className="mb-2">
                  {unreadMessages.length} Unread
                </Badge>
                {unreadMessages.slice(0, 2).map((msg) => (
                  <div key={msg.id} className="p-2 border rounded-md">
                    <p className="text-sm line-clamp-2">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No unread messages
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Workouts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Workouts</CardTitle>
            <Button variant="ghost" size="sm" onClick={onViewPlans}>
              <Dumbbell className="w-4 h-4 mr-1" />
              View Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clientWorkouts.length > 0 ? (
            <div className="space-y-2">
              {clientWorkouts.map((workout) => {
                const day = plan?.weeks
                  .find((w) => w.id === workout.weekId)
                  ?.days.find((d) => d.id === workout.dayId);

                return (
                  <div key={workout.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{day?.name || 'Workout'}</p>
                      <p className="text-xs text-muted-foreground">
                        {workout.exercises.length} exercises completed
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(workout.completedAt), 'MMM d')}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No workouts completed yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <Button variant="outline" className="w-full" onClick={onViewPlans}>
          <Dumbbell className="w-4 h-4 mr-2" />
          Manage Plan
        </Button>
        <Button variant="outline" className="w-full" onClick={onViewProgress}>
          <Ruler className="w-4 h-4 mr-2" />
          Track Progress
        </Button>
        <Button variant="outline" className="w-full" onClick={onViewChat}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </div>
    </div>
  );
}
