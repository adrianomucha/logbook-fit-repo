import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  /** String subtitles render as uppercase tracked labels; pass a node for custom metadata styling */
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Renders a small "‹ Clients" back link above the title. */
  breadcrumb?: { label: string; onClick: () => void };
  /** A face beside the title, for pages about one person */
  avatar?: ReactNode;
}

export function PageHeader({ title, subtitle, action, breadcrumb, avatar }: PageHeaderProps) {
  const crumb = breadcrumb && (
    <button
      onClick={breadcrumb.onClick}
      className={cn(
        // Beside an avatar the title block is taller, so the crumb gets
        // its own row instead of crowding the face
        avatar ? 'mb-4 sm:mb-5' : 'mb-1',
        'flex items-center gap-0.5 -ms-1.5 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 tap-target'
      )}
    >
      <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
      {breadcrumb.label}
    </button>
  );

  const heading = (
    <div className="min-w-0">
      {/* Wrap on phones: beside the action block a truncated name has
          nowhere else on the page to be read in full */}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight antialiased break-words sm:truncate">
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
  );

  // With an avatar the crumb spans the page on its own row, and the actions
  // sit level with the face and name they act on
  if (avatar) {
    return (
      <div>
        {crumb}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {avatar}
            {heading}
          </div>
          {action}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {crumb}
        {heading}
      </div>
      {action}
    </div>
  );
}
