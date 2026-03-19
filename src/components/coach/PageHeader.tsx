import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
