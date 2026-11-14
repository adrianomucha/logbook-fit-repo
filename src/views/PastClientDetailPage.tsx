import { type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { PAST_CLIENT } from '@logbook/shared/coach-copy';
import { FEELING_DISPLAY } from '@logbook/shared/feeling-display';
import { usePastClient } from '@/hooks/api/useCoachClients';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const day = (iso: string | null) => (iso ? format(new Date(iso), 'MMM d, yyyy') : '');

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="animate-enter">
      <h2 className="mb-2 flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground antialiased">
        {title}
        <span className="tabular-nums">{count}</span>
      </h2>
      <div className="bg-card rounded-2xl border border-border/70 overflow-hidden">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-sm text-muted-foreground antialiased">{children}</p>;
}

/**
 * A past client's record, read only: what they trained on this coach's
 * plans, the check-ins, and the conversation. No actions live here; Restore
 * stays on the list.
 */
export function PastClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const { archive, error, isLoading } = usePastClient(params?.clientId ?? null);
  const back = () => router.push('/coach/clients/past');

  const name = archive ? archive.user.name || archive.user.email : '';

  return (
    <div className="min-h-dvh bg-background pb-24 sm:pb-8">
      <CoachNav activeTab="clients" />

      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 px-4 pt-5 sm:px-6 sm:pt-10 lg:px-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12" role="status">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Loading</span>
          </div>
        ) : error || !archive ? (
          <div className="py-12 text-center space-y-4">
            <p className="text-sm text-muted-foreground antialiased">{PAST_CLIENT.notFound}</p>
            <Button variant="outline" onClick={back}>
              Past clients
            </Button>
          </div>
        ) : (
          <>
            <div className="animate-enter">
              <PageHeader
                eyebrow={PAST_CLIENT.eyebrow}
                title={name}
                subtitle={`${PAST_CLIENT.ended(archive.endedBy === 'CLIENT', day(archive.endedAt))} · ${PAST_CLIENT.readOnly}`}
                breadcrumb={{ label: 'Past clients', onClick: back }}
                avatar={
                  <UserAvatar
                    name={name}
                    avatarUrl={archive.user.avatarUrl}
                    className="w-12 h-12 sm:w-14 sm:h-14 text-base"
                  />
                }
              />
            </div>

            <Section title={PAST_CLIENT.workouts} count={archive.workouts.length}>
              {archive.workouts.length === 0 ? (
                <Empty>{PAST_CLIENT.noWorkouts}</Empty>
              ) : (
                <ul className="divide-y divide-border/50">
                  {archive.workouts.map((w) => (
                    <li key={w.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate antialiased">{w.dayName || 'Workout'}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 antialiased">{w.planName}</p>
                      </div>
                      <p className="shrink-0 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums antialiased">
                        {day(w.completedAt)}
                        {w.exercisesTotal != null && (
                          <span className="block mt-0.5">
                            {w.exercisesDone ?? 0}/{w.exercisesTotal} exercises
                            {w.durationSec != null && ` · ${Math.max(1, Math.round(w.durationSec / 60))} min`}
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={PAST_CLIENT.checkIns} count={archive.checkIns.length}>
              {archive.checkIns.length === 0 ? (
                <Empty>{PAST_CLIENT.noCheckIns}</Empty>
              ) : (
                <ul className="divide-y divide-border/50">
                  {archive.checkIns.map((c) => {
                    const feeling = c.clientFeeling ? FEELING_DISPLAY[c.clientFeeling] : null;
                    const effort = c.effortRating ? FEELING_DISPLAY[c.effortRating] : null;
                    return (
                      <li key={c.id} className="px-4 py-3 space-y-1.5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums antialiased">
                          {day(c.createdAt)}
                          {effort && <span className={effort.text}> · {effort.label}</span>}
                          {feeling && <span className={feeling.text}> · {feeling.label}</span>}
                          {!c.clientRespondedAt && ' · No reply'}
                        </p>
                        {/* Older rows stored the feeling as free text */}
                        {c.clientFeeling && !feeling && (
                          <p className="text-sm antialiased whitespace-pre-wrap break-words">{c.clientFeeling}</p>
                        )}
                        {c.painBlockers && (
                          <p className="text-sm antialiased whitespace-pre-wrap break-words">{c.painBlockers}</p>
                        )}
                        {c.coachFeedback && (
                          <p className="text-sm text-muted-foreground antialiased whitespace-pre-wrap break-words border-l-2 border-border pl-3">
                            {c.coachFeedback}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section title={PAST_CLIENT.conversation} count={archive.messages.length}>
              {archive.messages.length === 0 ? (
                <Empty>{PAST_CLIENT.noMessages}</Empty>
              ) : (
                <ul className="px-4 py-4 space-y-3">
                  {archive.messages.map((m) => (
                    <li key={m.id} className={cn('flex flex-col', m.fromCoach ? 'items-end' : 'items-start')}>
                      <p
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm antialiased whitespace-pre-wrap break-words',
                          m.fromCoach ? 'bg-foreground text-background' : 'bg-muted'
                        )}
                      >
                        {m.content}
                      </p>
                      <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums antialiased">
                        {m.fromCoach ? 'You' : name.split(/\s+/)[0]} · {format(new Date(m.createdAt), 'MMM d, yyyy')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
