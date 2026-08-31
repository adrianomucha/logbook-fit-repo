import { FileSpreadsheet, Plus, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* Empty and error states as ghost previews: a faded mock of the list this
   screen will become, fading out into the page, with the brand kicker + volt
   CTA beneath. Empty states teach the layout before there's data to show it;
   load errors render the same ghost with its live-dot gone amber — the data
   is out there, the signal dropped. */

const cardShadow =
  'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]';

const fadeMask = {
  maskImage: 'linear-gradient(to bottom, black 25%, transparent 88%)',
  WebkitMaskImage: 'linear-gradient(to bottom, black 25%, transparent 88%)',
} as const;

function EmptyStateShell({
  preview,
  kicker,
  kickerDotClassName = 'bg-brand',
  title,
  body,
  cta,
}: {
  preview: React.ReactNode;
  kicker: string;
  kickerDotClassName?: string;
  title: string;
  body: React.ReactNode;
  cta: React.ReactNode;
}) {
  return (
    <div className="animate-enter flex flex-col items-center text-center px-4 pt-4 sm:pt-8 pb-8">
      {preview}
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2 antialiased flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${kickerDotClassName}`} aria-hidden="true" />
        {kicker}
      </p>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1.5 antialiased">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-[300px] mb-6 antialiased">{body}</p>
      {cta}
    </div>
  );
}

/** Ghost of the roster list: avatar, name + signal line, urgency chip.
    `tone="lost"` is the load-error variant: the volt live-dot goes amber
    and pulses — the roster's still out there, the signal dropped. */
function GhostRoster({ tone = 'live' }: { tone?: 'live' | 'lost' }) {
  const rows = [
    { name: 'w-28', signal: 'w-40', opacity: 'opacity-100' },
    { name: 'w-36', signal: 'w-32', opacity: 'opacity-60' },
    { name: 'w-24', signal: 'w-44', opacity: 'opacity-30' },
  ];
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-sm mb-3 sm:mb-4 select-none pointer-events-none"
      style={fadeMask}
    >
      <div className={`bg-card rounded-xl divide-y divide-border overflow-hidden ${cardShadow}`}>
        {rows.map((row, i) => (
          <div
            key={i}
            className={`animate-ghost-row flex items-center gap-3 px-4 py-3.5 ${row.opacity}`}
            style={{ animationDelay: `${120 + i * 110}ms` }}
          >
            <div className="relative w-10 h-10 rounded-full bg-muted shrink-0">
              {/* volt live-dot on the top row — the roster ranks who needs you */}
              {i === 0 &&
                (tone === 'lost' ? (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-warning ring-2 ring-card motion-safe:animate-pulse" />
                ) : (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-card animate-bounce-once"
                    style={{ animationDelay: '560ms' }}
                  />
                ))}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className={`h-2.5 rounded-full bg-muted ${row.name}`} />
              <div className={`h-2 rounded-full bg-muted/70 ${row.signal}`} />
            </div>
            <div className="w-12 h-4 rounded-full bg-muted/70 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ghost of the Plans list: emoji tile, name, aligned mono stat columns. */
function GhostPlanList() {
  const rows = [
    { name: 'w-32', opacity: 'opacity-100' },
    { name: 'w-24', opacity: 'opacity-60' },
    { name: 'w-40', opacity: 'opacity-30' },
  ];
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-sm mb-3 sm:mb-4 select-none pointer-events-none"
      style={fadeMask}
    >
      <div className={`bg-card rounded-xl divide-y divide-border overflow-hidden ${cardShadow}`}>
        {rows.map((row, i) => (
          <div
            key={i}
            className={`animate-ghost-row flex items-center gap-3 px-4 py-3.5 ${row.opacity}`}
            style={{ animationDelay: `${120 + i * 110}ms` }}
          >
            <div className="relative w-9 h-9 rounded-lg bg-muted shrink-0">
              {i === 0 && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-card animate-bounce-once"
                  style={{ animationDelay: '560ms' }}
                />
              )}
            </div>
            <div className={`h-2.5 rounded-full bg-muted ${row.name}`} />
            <div className="ml-auto flex items-center gap-3 shrink-0">
              <div className="w-10 h-2 rounded-full bg-muted/70" />
              <div className="w-12 h-2 rounded-full bg-muted/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ghost of a client profile: header with avatar + name, mono stat strip.
    Error-only, so the dot is always the amber "signal lost" one. */
function GhostProfile() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-sm mb-3 sm:mb-4 select-none pointer-events-none"
      style={fadeMask}
    >
      <div className={`bg-card rounded-xl overflow-hidden ${cardShadow}`}>
        <div className="animate-ghost-row flex items-center gap-3 px-4 py-4" style={{ animationDelay: '120ms' }}>
          <div className="relative w-12 h-12 rounded-full bg-muted shrink-0">
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-warning ring-2 ring-card motion-safe:animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3 w-32 rounded-full bg-muted" />
            <div className="h-2 w-24 rounded-full bg-muted/70" />
          </div>
        </div>
        <div
          className="animate-ghost-row grid grid-cols-3 divide-x divide-border border-t border-border opacity-60"
          style={{ animationDelay: '230ms' }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-4 py-3 space-y-2">
              <div className="h-2 w-10 rounded-full bg-muted/70" />
              <div className="h-3 w-14 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Branded load-failure state: the ghost of the screen that failed to load,
    amber signal-lost accents, and a volt retry CTA. Must never masquerade as
    an empty state — the kicker and dot colour carry the distinction. */
export function LoadErrorState({
  kicker,
  title,
  body = 'Something went wrong on our end or with your connection.',
  onRetry,
  preview = 'roster',
}: {
  kicker: string;
  title: string;
  body?: React.ReactNode;
  onRetry: () => void;
  preview?: 'roster' | 'profile';
}) {
  return (
    <EmptyStateShell
      preview={preview === 'profile' ? <GhostProfile /> : <GhostRoster tone="lost" />}
      kicker={kicker}
      kickerDotClassName="bg-warning motion-safe:animate-pulse"
      title={title}
      body={body}
      cta={
        <Button
          onClick={onRetry}
          className="h-11 px-6 rounded-xl gap-2 bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-bold uppercase tracking-wider active:scale-[0.97] transition-[background-color,transform] duration-150"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </Button>
      }
    />
  );
}

export function EmptyStateNoClients({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyStateShell
      preview={<GhostRoster />}
      kicker="Roster · 0 clients"
      title="No clients yet"
      body="Send an invite link — the moment your client signs up, they land here, ranked by who needs your attention."
      cta={
        <Button
          onClick={onInvite}
          className="h-11 px-6 rounded-xl gap-2 bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-bold uppercase tracking-wider active:scale-[0.97] transition-[background-color,transform] duration-150"
        >
          <UserPlus className="w-4 h-4" />
          Invite Client
        </Button>
      }
    />
  );
}

export function EmptyStateNoPlans({
  onCreate,
  onImport,
}: {
  onCreate?: () => void;
  onImport?: () => void;
}) {
  return (
    <EmptyStateShell
      preview={<GhostPlanList />}
      kicker="Plan library · 0 templates"
      title="Your blank canvas"
      body="Design a workout template, then assign it to any client. One plan, many athletes."
      cta={
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button
            onClick={onCreate}
            className="h-11 px-6 rounded-xl gap-2 bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-bold uppercase tracking-wider active:scale-[0.97] transition-[background-color,transform] duration-150"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
          {onImport && (
            <Button
              onClick={onImport}
              variant="outline"
              className="h-11 px-6 rounded-xl gap-2 text-sm font-medium active:scale-[0.97] transition-transform duration-150"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Import from Excel
            </Button>
          )}
        </div>
      }
    />
  );
}
