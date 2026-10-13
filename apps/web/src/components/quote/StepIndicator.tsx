import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export const STEPS = [
  { id: 'customer', label: 'Customer' },
  { id: 'items', label: 'Items' },
  { id: 'details', label: 'Scope & terms' },
  { id: 'preview', label: 'Preview' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

interface StepIndicatorProps {
  current: StepId;
  /** When provided, completed/other steps become buttons. */
  onSelect?: (step: StepId) => void;
}

export function StepIndicator({ current, onSelect }: StepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <>
    <p className="mb-2 text-sm font-semibold text-brand-700 sm:hidden">Step {currentIndex + 1} of {STEPS.length} · {STEPS[currentIndex]?.label}</p>
    <ol className="mb-6 flex items-center gap-1.5 sm:gap-3" aria-label="Progress">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const clickable = !!onSelect && step.id !== 'customer';
        const content = (
          <>
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset transition',
                done && 'bg-brand-600 text-white ring-brand-600',
                active && 'bg-brand-900 text-white ring-brand-900',
                !done && !active && 'bg-white text-ink-muted ring-surface-line',
              )}
            >
              {done ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className={cn('hidden text-sm font-semibold sm:inline', active ? 'text-brand-900' : 'text-ink-muted')}>{step.label}</span>
          </>
        );
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={active ? 'step' : undefined}>
            {clickable ? (
              <button type="button" onClick={() => onSelect?.(step.id)} className="flex items-center gap-2 rounded-full" aria-label={step.label}>{content}</button>
            ) : (
              <span className="flex items-center gap-2">{content}</span>
            )}
            {index < STEPS.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', done ? 'bg-brand-500' : 'bg-surface-line')} aria-hidden />}
          </li>
        );
      })}
    </ol>
    </>
  );
}
