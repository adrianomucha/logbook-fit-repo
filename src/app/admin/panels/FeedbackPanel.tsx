import prisma from '@/lib/prisma';
import { FeedbackStatusActions } from './FeedbackStatusActions';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const CATEGORY_LABELS = {
  BUG: 'Bug',
  IDEA: 'Idea',
  OTHER: 'Other',
} as const;

function CategoryChip({ category }: { category: keyof typeof CATEGORY_LABELS }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

/** Feedback tab. Access is checked once by the /admin page that renders it. */
export async function FeedbackPanel() {
  const entries = await prisma.feedback.findMany({
    // Inbox order: everything unresolved first, newest of those on top,
    // resolved history below
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      role: true,
      category: true,
      message: true,
      pageUrl: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  const newCount = entries.filter((e) => e.status === 'NEW').length;

  return (
    <div className="flex min-h-0 flex-1 flex-col py-10">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 sm:px-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Feedback</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {newCount}
            </span>{' '}
            new
            <span className="font-mono text-[11px] uppercase tracking-[0.08em]">
              {' '}
              · {entries.length} total
            </span>
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nothing yet. Feedback sent from the account menu&rsquo;s
            &ldquo;Send feedback&rdquo; dialog lands here.
          </div>
        ) : (
          <div className="mt-8 min-h-0 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap">
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border/60 align-top last:border-0"
                  >
                    <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                      {dateFmt.format(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium">
                        {entry.user?.name ?? 'Deleted account'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.user?.email ?? '—'}
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
                          {' '}
                          · {entry.role === 'COACH' ? 'Coach' : 'Client'}
                        </span>
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryChip category={entry.category} />
                    </td>
                    {/* The one column allowed to wrap — everything else stays
                        on a line so long messages get the width */}
                    <td className="min-w-[16rem] max-w-xl px-4 py-3">
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {entry.message}
                      </p>
                      {entry.pageUrl && (
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {entry.pageUrl}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <FeedbackStatusActions
                        id={entry.id}
                        status={entry.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Mark entries reviewed as you read them; resolve once acted on (or
          consciously declined). The sender isn&rsquo;t notified either way.
        </p>
      </div>
    </div>
  );
}
