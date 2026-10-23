import { Camera, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { avatarColor } from '@/lib/avatar-colors';
import { cn } from '@/lib/utils';
import { WELCOME_COPY } from '@logbook/shared/client-empty-states';
import { WorkoutMarkIcon } from './WorkoutMarkIcon';

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

  // The same marks as the week list: done, underway, still to come
  const steps = WELCOME_COPY.steps(coachName);

  return (
    <div className="space-y-5 sm:space-y-6 animate-enter">
      {/* Welcome header */}
      <div className="pt-2 sm:pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5 antialiased">
          {WELCOME_COPY.eyebrow}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight antialiased">
          {WELCOME_COPY.title(firstName)}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed antialiased">
          {WELCOME_COPY.body(coachName)}
        </p>
      </div>

      {/* Progress steps */}
      <div className="rounded-2xl border border-border/70 bg-card divide-y divide-border/50 overflow-hidden">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-3 px-4 py-3.5">
            <WorkoutMarkIcon mark={step.mark} size={24} />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-semibold leading-snug antialiased',
                  step.mark === 'upcoming' && 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 antialiased">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Say hi — nudges the coach and starts the relationship off warm */}
      {canMessage && (
        <div className="rounded-2xl border border-border/70 bg-card px-4 py-4">
          <p className="text-[15px] font-bold tracking-tight antialiased">
            {WELCOME_COPY.sayHiTitle}
          </p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed antialiased">
            {WELCOME_COPY.sayHiBody(coachName)}
          </p>
          <Button
            onClick={onMessageCoach}
            className="w-full h-11 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-transform duration-150 mt-3"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {WELCOME_COPY.sayHiCta(coachFirstName)}
          </Button>
        </div>
      )}

      {/* Photo nudge — the coach sees the client as a monogram on their
          roster until this is set. Quieter than the say-hi card: the
          monogram they'd otherwise be, one line, and a small outline action.
          The button sits beside the text where there's room and drops
          under it on a phone, so the title never wraps around it. */}
      {!hasPhoto && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3.5">
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
