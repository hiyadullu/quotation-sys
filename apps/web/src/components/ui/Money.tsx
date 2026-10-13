import { formatINR } from '@pool-quote/shared';
import { cn } from '@/lib/cn';

export function Money({ value, decimals = 'auto', className }: { value: number; decimals?: 'auto' | 0 | 2; className?: string }) {
  return <span className={cn('tabular whitespace-nowrap', className)}>{formatINR(value, decimals)}</span>;
}
