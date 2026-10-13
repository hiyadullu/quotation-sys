import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  GST_SLABS,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  formatINR,
  productSchema,
  type ProductCategory,
  type ProductDTO,
  type ProductInput,
} from '@pool-quote/shared';
import { useAuth } from '@/auth/AuthContext';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { keys, useDebounced, useProducts } from '@/lib/queries';

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory | undefined>();
  const [showInactive, setShowInactive] = useState(false);
  const debounced = useDebounced(search);
  const { data: products, isLoading, error, refetch } = useProducts({ search: debounced, category, includeInactive: showInactive });
  const [editing, setEditing] = useState<ProductDTO | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ProductDTO | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<{ archived: boolean }>(`/products/${id}`),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: keys.products });
      toast.success(res.archived ? 'Item is used on quotations, so it was archived instead' : 'Item deleted');
      setDeleting(null);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Products & services"
        subtitle={isAdmin ? 'Maintain the items your team picks from when quoting.' : 'The catalogue you can pick from when quoting.'}
        actions={isAdmin && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Add item</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items, brands or models" aria-label="Search products" className="input pl-10" />
        </div>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-4 w-4 rounded border-surface-line text-brand-600" /> Show archived
          </label>
        )}
      </div>

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {[undefined, ...PRODUCT_CATEGORIES].map((c) => (
          <button key={c ?? 'all'} type="button" onClick={() => setCategory(c)}
            className={cn('shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-inset transition', category === c ? 'bg-brand-900 text-white ring-brand-900' : 'bg-white text-ink-soft ring-surface-line hover:bg-surface-alt')}>
            {c ? PRODUCT_CATEGORY_LABELS[c] : 'All'}
          </button>
        ))}
      </div>

      {error ? (
        <div className="card"><ErrorState error={error} onRetry={() => void refetch()} /></div>
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : products && products.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className={cn('card flex flex-col overflow-hidden', !p.isActive && 'opacity-60')}>
              <div className="flex gap-3 p-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-brand-500">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-7 w-7" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap gap-1.5"><Pill tone="brand">{PRODUCT_CATEGORY_LABELS[p.category]}</Pill>{!p.isActive && <Pill tone="warn">Archived</Pill>}</div>
                  <h3 className="font-sans text-[15px] font-bold leading-snug text-ink">{p.name}</h3>
                  {(p.brand || p.model) && <p className="truncate text-sm text-ink-muted">{[p.brand, p.model].filter(Boolean).join(' · ')}</p>}
                </div>
              </div>
              {p.description && <p className="line-clamp-2 px-4 text-sm text-ink-soft">{p.description}</p>}
              <div className="mt-auto flex items-end justify-between gap-2 px-4 pb-3 pt-3">
                <div>
                  <span className="tabular text-lg font-extrabold text-brand-900">{formatINR(p.price)}</span>
                  <span className="text-sm text-ink-muted"> / {p.unit}</span>
                  <div className="text-xs text-ink-muted">GST {p.gstPercent}%</div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label={`Remove ${p.name}`} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card">
          <EmptyState icon={<Package className="h-7 w-7" />} title="No items found" action={isAdmin && !debounced && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Add the first item</Button>}>
            {debounced || category ? 'Try a different search or category.' : 'Add the equipment, materials and services you quote most often.'}
          </EmptyState>
        </div>
      )}

      {editing !== null && <ProductModal product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog open={!!deleting} title="Remove this item?" confirmLabel="Remove" danger loading={remove.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)}>
        <strong>{deleting?.name}</strong> will be removed from the catalogue. If it appears on existing quotations it is archived instead, so those quotations stay intact.
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted"><Archive className="h-4 w-4" />Archived items stay hidden from sales users.</p>
      </ConfirmDialog>
    </>
  );
}

function ProductModal({ product, onClose }: { product: ProductDTO | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      category: product?.category ?? 'EQUIPMENT',
      brand: product?.brand ?? '',
      model: product?.model ?? '',
      unit: product?.unit ?? 'Nos',
      price: product?.price ?? 0,
      gstPercent: product?.gstPercent ?? 18,
      isActive: product?.isActive ?? true,
    },
  });

  const save = useMutation({
    mutationFn: async (input: ProductInput) => {
      const saved = product ? await api.put<ProductDTO>(`/products/${product.id}`, input) : await api.post<ProductDTO>('/products', input);
      if (file) await api.upload<ProductDTO>(`/products/${saved.id}/image`, file);
      return saved;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.products });
      toast.success(product ? 'Item updated' : 'Item added');
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const removeImage = useMutation({
    mutationFn: () => api.delete<ProductDTO>(`/products/${product?.id}/image`),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: keys.products }); toast.success('Image removed'); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const num = { valueAsNumber: true } as const;
  return (
    <Modal open onClose={onClose} title={product ? 'Edit item' : 'Add item'} size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="product-form" loading={save.isPending}>Save item</Button></>}>
      <form id="product-form" onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Item name" required wrapperClassName="sm:col-span-2" error={errors.name?.message} {...register('name')} />
        <Select label="Category" error={errors.category?.message} {...register('category')}>
          {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{PRODUCT_CATEGORY_LABELS[c]}</option>)}
        </Select>
        <Input label="Unit" required list="product-units" error={errors.unit?.message} {...register('unit')} />
        <datalist id="product-units">{['Nos', 'Set', 'Mtr', 'Sq.ft', 'Cu.m', 'Kg', 'Job'].map((u) => <option key={u} value={u} />)}</datalist>
        <Input label="Brand" error={errors.brand?.message} {...register('brand')} />
        <Input label="Model" error={errors.model?.message} {...register('model')} />
        <Input label="Standard price (₹)" required type="number" inputMode="decimal" step="any" min="0" error={errors.price?.message} {...register('price', num)} />
        <Select label="GST" {...register('gstPercent', num)}>
          {GST_SLABS.map((g) => <option key={g} value={g}>{g}%</option>)}
        </Select>
        <Textarea label="Description" rows={3} wrapperClassName="sm:col-span-2" hint="Shown under the item name on the quotation." error={errors.description?.message} {...register('description')} />
        <ImageUpload className="sm:col-span-2" label="Product image (optional)" url={product?.imageUrl} pendingFile={file} onSelect={setFile}
          onRemove={product?.imageUrl && !file ? () => removeImage.mutate() : file ? () => setFile(null) : undefined} />
        <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 rounded border-surface-line text-brand-600" {...register('isActive')} /> Available for new quotations
        </label>
      </form>
    </Modal>
  );
}
