'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export type StatusType = 'workout-scheduled' | 'in-progress' | 'completed' | 'coach-updated';

interface StatusHeaderProps {
  status: StatusType;
  clientName?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const statusConfig: Record<StatusType, { label: string; dot: string }> = {
  'workout-scheduled': { label: 'Ready to train', dot: 'bg-info' },
  'in-progress': { label: 'In progress', dot: 'bg-warning' },
  'completed': { label: 'Complete', dot: 'bg-success' },
  'coach-updated': { label: 'Plan updated', dot: 'bg-info' },
};

export function StatusHeader({ status, clientName }: StatusHeaderProps) {
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setDateStr(format(new Date(), 'EEEE, MMMM d'));
    setGreeting(getGreeting());
  }, []);

  const firstName = clientName?.split(' ')[0];
  const { label, dot } = statusConfig[status];

  return (
    <div className="pt-2">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {dateStr || '\u00A0'}
      </p>
      <div className="flex items-end justify-between gap-3 mt-1.5">
        <h1 className="text-[26px] sm:text-3xl font-bold tracking-tight leading-tight">
          {greeting && firstName ? `${greeting}, ${firstName}` : label}
        </h1>
        {greeting && firstName && (
          <span className="flex items-center gap-1.5 shrink-0 rounded-full bg-muted/70 pl-2.5 pr-3 py-1 mb-1">
            <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
            <span className="font-mono text-[10px] text-muted-foreground font-medium uppercase tracking-[0.08em] whitespace-nowrap">
              {label}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
