import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  /** String subtitles render as uppercase tracked labels; pass a node for custom metadata styling */
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Renders a small "‹ Clients" back link above the title. */
  breadcrumb?: { label: string; onClick: () => void };
}

export function PageHeader({ title, subtitle, action, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb && (
          <button
            onClick={breadcrumb.onClick}
            className="flex items-center gap-0.5 -ml-1.5 mb-1 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 tap-target"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            {breadcrumb.label}
          </button>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight antialiased truncate">
          {title}
        </h1>
        {subtitle != null && (
          typeof subtitle === 'string' ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-1.5 antialiased">
              {subtitle}
            </p>
          ) : (
            <div className="mt-1.5">{subtitle}</div>
          )
        )}
      </div>
      {action}
    </div>
  );
}
