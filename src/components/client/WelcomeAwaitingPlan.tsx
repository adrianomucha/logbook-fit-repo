import { Camera, Check, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { avatarColor } from '@/lib/avatar-colors';
import { cn } from '@/lib/utils';

interface WelcomeAwaitingPlanProps {
  clientName: string;
  coachName: string;
  /** Whether the client can message their coach (a coach relationship exists) */
  canMessage: boolean;
  onMessageCoach: () => void;
  /** Client has a profile photo — hides the add-photo nudge */
  hasPhoto: boolean;
  onAddPhoto: () => void;
}

/**
 * What a client sees between signing up and getting their first plan.
 * Replaces the old dead-end "hang tight" screen: welcomes them, shows
 * where they are in the getting-started arc, and opens a line to the coach.
 */
export function WelcomeAwaitingPlan({
  clientName,
  coachName,
  canMessage,
  onMessageCoach,
  hasPhoto,
  onAddPhoto,
}: WelcomeAwaitingPlanProps) {
  const firstName = clientName.split(' ')[0];
  const coachFirstName = coachName.split(' ')[0];

  const steps = [
    { label: 'Create your account', detail: 'Done, welcome aboard', state: 'done' as const },
    { label: `${coachName} builds your plan`, detail: 'Usually ready within a day or two', state: 'active' as const },
    { label: 'Start training', detail: 'Your workouts will appear right here', state: 'upcoming' as const },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 animate-enter">
      {/* Welcome header */}
      <div className="pt-2 sm:pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5 antialiased">
          Getting started
        </p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight antialiased">
          You&apos;re in, {firstName} 👊
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed antialiased">
          {coachName} is putting your training plan together.
        </p>
      </div>

      {/* Progress steps */}
      <div className="bg-card rounded-xl divide-y divide-border overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3 px-4 py-3.5">
            {/* Step marker */}
            <span
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                step.state === 'done' && 'bg-foreground text-background',
                step.state === 'active' && 'bg-brand/25',
                step.state === 'upcoming' && 'bg-muted'
              )}
            >
              {step.state === 'done' ? (
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
              ) : step.state === 'active' ? (
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" aria-hidden="true" />
              ) : (
                <span className="text-[10px] font-black tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, '0')}
                </span>
              )}
            </span>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-bold leading-snug antialiased',
                  step.state === 'upcoming' && 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 antialiased">{step.detail}</p>
            </div>

            {step.state === 'active' && (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground shrink-0 antialiased">
                In progress
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Say hi — nudges the coach and starts the relationship off warm */}
      {canMessage && (
        <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
          <p className="text-[15px] font-bold tracking-tight antialiased">
            Break the ice while you wait
          </p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed antialiased">
            Tell {coachName} about your goals, schedule, or any injuries. It all helps shape your plan.
          </p>
          <Button
            onClick={onMessageCoach}
            className="w-full h-11 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-transform duration-150 mt-3"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Say hi to {coachName}
          </Button>
        </div>
      )}

      {/* Photo nudge — the coach sees the client as a monogram on their
          roster until this is set. Quieter than the say-hi card: the
          monogram they'd otherwise be, one line, and a small outline action.
          The button sits beside the text where there's room and drops
          under it on a phone, so the title never wraps around it. */}
      {!hasPhoto && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3.5">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold select-none',
                avatarColor(clientName)
              )}
              aria-hidden="true"
            >
              {firstName.charAt(0).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-snug antialiased">Put a face to your name</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed antialiased">
                {coachFirstName} sees this on your card. A photo helps.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddPhoto}
            className="shrink-0 self-start sm:self-auto ms-12 sm:ms-0 active:scale-[0.96] transition-transform duration-150"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Add photo
          </Button>
        </div>
      )}
    </div>
  );
}
