import { type ReactNode } from 'react';

/** Closed state palette — the SAME five tones as the widget family
 *  (CalendarWidget/ResourceTimeline). The tone follows the VALUE's STATE, never
 *  the category: an "Überfällig: 0" card stays 'default', not 'destructive'. */
export type StatCardTone = 'default' | 'primary' | 'success' | 'warning' | 'destructive';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  /** Rendered JSX, e.g. icon={<IconBook size={18} className="text-muted-foreground" />} */
  icon?: ReactNode;
  /** State tint + value colour from the family palette. Compute it from the
   *  data (thresholds live in the consumer), don't hardcode per category. */
  tone?: StatCardTone;
  /** Makes the card a real button (hover/focus affordances included). The
   *  idiom: a clickable KPI FILTERS the surface below it — pair with `active`
   *  and toggle off on the second click. No separate filter-chip row needed. */
  onClick?: () => void;
  /** Pressed look while this card's filter is applied (shows a ✕ hint). */
  active?: boolean;
  /** Free footer slot the consumer composes from its own data: a delta
   *  ("▲ +12 % vs. Mai"), a small sparkline, a progress bar against a target,
   *  or the next deadline. Optional — omit when the data has no real context. */
  footer?: ReactNode;
  className?: string;
}

const TONE_CARD: Record<StatCardTone, string> = {
  default: '',
  primary: 'border-primary/30',
  success: 'border-emerald-200',
  warning: 'border-amber-200 bg-gradient-to-b from-amber-50/70 to-card',
  destructive: 'border-red-200 bg-gradient-to-b from-red-50/70 to-card',
};
const TONE_VALUE: Record<StatCardTone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-600',
  warning: 'text-amber-700',
  destructive: 'text-destructive',
};

export function StatCard({ title, value, description, icon, tone = 'default', onClick, active = false, footer, className }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
        {active ? (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold leading-none text-background"
            aria-hidden
          >
            ✕
          </span>
        ) : icon}
      </div>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate ${TONE_VALUE[tone]}`}>{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{description}</p>
      )}
      {footer && <div className="mt-2 sm:mt-3 min-w-0">{footer}</div>}
    </>
  );

  // Compact on phones (p-4): a 2×2 KPI grid must never push the primary work
  // surface below the first viewport. Roomy from sm upwards.
  const shell = `rounded-xl border bg-card p-4 sm:p-6 shadow-sm overflow-hidden ${TONE_CARD[tone]}${active ? ' ring-2 ring-inset ring-foreground/70' : ''}${className ? ` ${className}` : ''}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`block w-full text-left transition-all hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${shell}`}
      >
        {content}
      </button>
    );
  }
  return <div className={shell}>{content}</div>;
}
