import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS, formatINR, type ProductCategory, type ProductDTO } from '@pool-quote/shared';
import { cn } from '@/lib/cn';
import { useDebounced, useProducts } from '@/lib/queries';
import { Skeleton } from '../ui/Feedback';
import { Modal } from '../ui/Modal';

interface ProductPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (product: ProductDTO) => void;
}

/** Pick one or more items from the product / service master; stays open so several can be added. */
export function ProductPicker({ open, onClose, onPick }: ProductPickerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory | undefined>();
  const debounced = useDebounced(search);
  const { data: products, isLoading } = useProducts({ search: debounced, category });
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const pick = (product: ProductDTO) => {
    onPick(product);
    setJustAdded(product.id);
    setTimeout(() => setJustAdded((id) => (id === product.id ? null : id)), 1200);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add from catalogue" description="Tap an item to add it to the quotation." size="lg">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items, brands or models" aria-label="Search catalogue" className="input pl-10" autoFocus />
      </div>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {[undefined, ...PRODUCT_CATEGORIES].map((c) => (
          <button
            key={c ?? 'all'}
            type="button"
            onClick={() => setCategory(c)}
            className={cn('shrink-0 rounded-full px-3.5 py-1 text-sm font-semibold ring-1 ring-inset', category === c ? 'bg-brand-900 text-white ring-brand-900' : 'bg-white text-ink-soft ring-surface-line hover:bg-surface-alt')}
          >
            {c ? PRODUCT_CATEGORY_LABELS[c] : 'All'}
          </button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-surface-line rounded-lg border border-surface-line">
        {isLoading && [0, 1, 2, 3].map((i) => <li key={i} className="p-3"><Skeleton className="h-10" /></li>)}
        {products?.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => pick(p)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-brand-50">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{p.name}</span>
                <span className="block truncate text-sm text-ink-muted">
                  {PRODUCT_CATEGORY_LABELS[p.category]}{p.brand ? ` · ${p.brand}` : ''}{p.model ? ` ${p.model}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="tabular block text-sm font-bold">{formatINR(p.price)}</span>
                <span className="block text-xs text-ink-muted">per {p.unit} · GST {p.gstPercent}%</span>
              </span>
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition', justAdded === p.id ? 'bg-emerald-500 text-white' : 'bg-brand-50 text-brand-600')}>
                {justAdded === p.id ? '✓' : <Plus className="h-4 w-4" />}
              </span>
            </button>
          </li>
        ))}
        {products && products.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-muted">No items found. Use “Custom item” to type one in.</li>}
      </ul>
    </Modal>
  );
}
