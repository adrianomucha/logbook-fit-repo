'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export type StatusType = 'workout-scheduled' | 'in-progress' | 'completed' | 'rest-day' | 'coach-updated';

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
  'rest-day': { label: 'Rest day', dot: 'bg-muted-foreground/40' },
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
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
        {dateStr || '\u00A0'}
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
        {greeting && firstName ? `${greeting}, ${firstName}` : label}
      </h1>
      {greeting && firstName && (
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
          <span className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
