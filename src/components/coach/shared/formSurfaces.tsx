/**
 * The two shapes coach dialogs are built from.
 *
 * A dialog reads as busy when every element argues for attention: a label, a
 * bordered box, a hint, and a link all at their own weight. These keep it to
 * two tiers — one filled surface per field, and one quiet pill for everything
 * optional — so the primary action is the only loud thing on screen.
 */

/** Uppercase tracked mono — the same "data voice" used across list headers and stats */
export function FieldLabel({
  htmlFor,
  id,
  className,
  children,
}: {
  htmlFor?: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag
      htmlFor={htmlFor}
      id={id}
      className={`block font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground antialiased${
        className ? ` ${className}` : ''
      }`}
    >
      {children}
    </Tag>
  );
}

/**
 * A filled card holding its own label, so the field reads as one object instead
 * of a stack of label + box. Controls inside should be borderless and
 * transparent — the shell is the only boundary.
 */
export function FieldShell({
  label,
  htmlFor,
  trailing,
  children,
}: {
  label: string;
  htmlFor?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 overflow-hidden transition-colors focus-within:border-foreground/25 focus-within:bg-background">
      <div className="flex items-baseline justify-between gap-2 px-4 pt-3">
        <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
        {trailing}
      </div>
      {children}
    </div>
  );
}

/** Small pill action — the quiet tier, so nothing competes with the primary button */
export function Chip({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 h-8 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 tap-target"
    >
      {children}
    </button>
  );
}

/** Live stat line in the data voice — a dialog's state, given its own row so it never truncates */
export function StatusLine({
  tone = 'ready',
  pulse,
  children,
}: {
  tone?: 'ready' | 'idle';
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      aria-live="polite"
      className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums antialiased"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ring-2 ${
          tone === 'ready' ? 'bg-brand ring-brand/25' : 'bg-muted-foreground/40 ring-transparent'
        } ${pulse ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      {children}
    </p>
  );
}
