'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface StatusHeaderProps {
  /** Show the "Plan updated" pill — on while the client is still in week 1 of their plan */
  showPlanUpdated?: boolean;
  clientName?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function StatusHeader({ showPlanUpdated, clientName }: StatusHeaderProps) {
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setDateStr(format(new Date(), 'EEEE, MMMM d'));
    setGreeting(getGreeting());
  }, []);

  const firstName = clientName?.split(' ')[0];

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground truncate">
          {dateStr || ' '}
        </p>
        {greeting && firstName && showPlanUpdated && (
          <span className="flex items-center gap-1.5 shrink-0 rounded-full bg-muted/70 pl-2.5 pr-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-info shrink-0" />
            <span className="font-mono text-[10px] text-muted-foreground font-medium uppercase tracking-[0.08em] whitespace-nowrap">
              Plan updated
            </span>
          </span>
        )}
      </div>
      {/* Full width and truncated — the greeting must never wrap to a second line */}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight mt-1.5 truncate">
        {greeting && firstName ? `${greeting}, ${firstName}` : ' '}
      </h1>
    </div>
  );
}
