import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** String subtitles render as uppercase tracked labels; pass a node for custom metadata styling */
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Renders a muted clickable path crumb before the title (e.g. "Clients / Emma Wilson").
      Hidden on mobile, where the bottom nav covers the way back. */
  breadcrumb?: { label: string; onClick: () => void };
}

export function PageHeader({ title, subtitle, action, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight antialiased truncate">
          {breadcrumb && (
            <span className="hidden sm:inline">
              <button
                onClick={breadcrumb.onClick}
                className="font-normal text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {breadcrumb.label}
              </button>
              <span className="font-normal text-muted-foreground/40 mx-2.5" aria-hidden="true">
                /
              </span>
            </span>
          )}
          {title}
        </h1>
        {subtitle != null && (
          typeof subtitle === 'string' ? (
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mt-1 antialiased">
              {subtitle}
            </p>
          ) : (
            <div className="mt-1">{subtitle}</div>
          )
        )}
      </div>
      {action}
    </div>
  );
}
