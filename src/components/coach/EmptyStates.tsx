import { FileSpreadsheet, Plus, RefreshCw } from 'lucide-react';
import { CREATE_PLAN } from '@logbook/shared/coach-copy';
import { NO_PLANS_COPY } from '@logbook/shared/state-copy';
import type { StateArtId } from '@logbook/shared/state-art';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/states/StateView';

const voltCta =
  'h-11 px-6 rounded-xl gap-2 bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-bold uppercase tracking-wider active:scale-[0.97] transition-[background-color,transform] duration-150';

/** Branded load-failure state: the unplugged scene with its amber alert, and
    a volt retry CTA. Must never masquerade as an empty state: the amber art
    and the "couldn't load" headline carry the distinction. */
export function LoadErrorState({
  copy,
  onRetry,
}: {
  copy: { art: StateArtId; title: string; tail: string };
  onRetry: () => void;
}) {
  return (
    <StateView fill art={copy.art} title={copy.title} tail={copy.tail}>
      <Button onClick={onRetry} className={voltCta}>
        <RefreshCw className="w-4 h-4" />
        Try again
      </Button>
    </StateView>
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
    <StateView
      fill
      art={NO_PLANS_COPY.art}
      title={NO_PLANS_COPY.title}
      tail={NO_PLANS_COPY.tail}
      body={NO_PLANS_COPY.body}
    >
      <Button onClick={onCreate} className={voltCta}>
        <Plus className="w-4 h-4" />
        {CREATE_PLAN}
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
    </StateView>
  );
}
