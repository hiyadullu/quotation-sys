import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { toast } from 'sonner';
import { GST_SLABS, settingsSchema, type SettingsDTO, type SettingsInput } from '@pool-quote/shared';
import { Button } from '@/components/ui/Button';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { PageHeader } from '@/components/ui/PageHeader';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { keys, useSettings } from '@/lib/queries';
import { TemplatesTab } from './TemplatesTab';
import { UsersTab } from './UsersTab';

const TABS = [
  { id: 'company', label: 'Company', fields: ['companyName', 'tagline', 'address', 'city', 'state', 'pincode', 'gstin', 'mobile', 'email', 'website'] },
  { id: 'financial', label: 'Financial', fields: ['defaultGstPercent', 'bankName', 'accountName', 'accountNumber', 'ifsc', 'bankBranch', 'upiId'] },
  { id: 'quotation', label: 'Quotation', fields: ['quotePrefix', 'validityDays', 'defaultWarranty', 'signatoryName', 'signatoryTitle'] },
  { id: 'templates', label: 'Templates', fields: [] },
  { id: 'users', label: 'Users', fields: [] },
] as const;

type TabId = (typeof TABS)[number]['id'];

const toForm = (s: SettingsDTO): SettingsInput => ({
  companyName: s.companyName,
  tagline: s.tagline ?? '',
  address: s.address,
  city: s.city ?? '',
  state: s.state ?? '',
  pincode: s.pincode ?? '',
  gstin: s.gstin ?? '',
  mobile: s.mobile,
  email: s.email,
  website: s.website ?? '',
  defaultGstPercent: s.defaultGstPercent,
  bankName: s.bankName ?? '',
  accountName: s.accountName ?? '',
  accountNumber: s.accountNumber ?? '',
  ifsc: s.ifsc ?? '',
  bankBranch: s.bankBranch ?? '',
  upiId: s.upiId ?? '',
  quotePrefix: s.quotePrefix,
  validityDays: s.validityDays,
  defaultWarranty: s.defaultWarranty ?? '',
  signatoryName: s.signatoryName ?? '',
  signatoryTitle: s.signatoryTitle ?? '',
});

export default function SettingsPage() {
  const { data: settings, isLoading, error, refetch } = useSettings();
  if (isLoading) return <PageLoader />;
  if (error || !settings) return <div className="card"><ErrorState error={error} onRetry={() => void refetch()} /></div>;
  return <SettingsEditor settings={settings} />;
}

function SettingsEditor({ settings }: { settings: SettingsDTO }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('company');
  const [logoBusy, setLogoBusy] = useState<'logo' | 'signature' | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsInput>({ resolver: zodResolver(settingsSchema), defaultValues: toForm(settings) });

  const save = useMutation({
    mutationFn: (input: SettingsInput) => api.put<SettingsDTO>('/settings', input),
    onSuccess: (saved) => {
      qc.setQueryData(keys.settings, saved);
      reset(toForm(saved));
      toast.success('Settings saved');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const uploadImage = async (kind: 'logo' | 'signature', file: File | null) => {
    setLogoBusy(kind);
    try {
      const updated = file ? await api.upload<SettingsDTO>(`/settings/${kind}`, file) : await api.delete<SettingsDTO>(`/settings/${kind}`);
      qc.setQueryData(keys.settings, updated);
      toast.success(file ? 'Image uploaded' : 'Image removed');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLogoBusy(null);
    }
  };

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const hasError = (id: TabId) => TABS.find((t) => t.id === id)?.fields.some((f) => (errors as FieldErrors<SettingsInput>)[f as keyof SettingsInput]);
  const onInvalid = () => toast.error('Some fields need attention — check the tabs marked in red.');
  const isFormTab = tab === 'company' || tab === 'financial' || tab === 'quotation';
  const num = { valueAsNumber: true } as const;

  return (
    <>
      <PageHeader title="Settings" subtitle="Company details, defaults and team." />
      <div className="-mx-4 mb-5 overflow-x-auto border-b border-surface-line px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={cn('relative shrink-0 border-b-2 px-4 py-2.5 text-[15px] font-semibold transition', tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-muted hover:text-ink')}>
              {t.label}
              {hasError(t.id) && <span className="absolute right-1.5 top-2 h-2 w-2 rounded-full bg-red-500" aria-label="has errors" />}
            </button>
          ))}
        </div>
      </div>

      <form id="settings-form" onSubmit={handleSubmit((v) => save.mutate(v), onInvalid)} noValidate>
        <div className={cn('mx-auto max-w-3xl space-y-5', tab !== 'company' && 'hidden')}>
          <section className="card grid gap-5 p-5 sm:grid-cols-2">
            <ImageUpload label="Company logo" url={settings.logoUrl} busy={logoBusy === 'logo'} onSelect={(f) => void uploadImage('logo', f)} onRemove={() => void uploadImage('logo', null)} />
            <ImageUpload label="Authorized signature" url={settings.signatureUrl} busy={logoBusy === 'signature'} onSelect={(f) => void uploadImage('signature', f)} onRemove={() => void uploadImage('signature', null)} hint="Transparent PNG works best · max 2 MB" />
          </section>
          <section className="card grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Company name" required error={errors.companyName?.message} {...register('companyName')} />
            <Input label="Tagline" hint="Shown under the name on the quotation" error={errors.tagline?.message} {...register('tagline')} />
            <Textarea label="Address" required rows={2} wrapperClassName="sm:col-span-2" error={errors.address?.message} {...register('address')} />
            <Input label="City" error={errors.city?.message} {...register('city')} />
            <Input label="State" error={errors.state?.message} {...register('state')} />
            <Input label="PIN code" inputMode="numeric" error={errors.pincode?.message} {...register('pincode')} />
            <Input label="GST number" className="uppercase" error={errors.gstin?.message} {...register('gstin')} />
            <Input label="Mobile" required inputMode="tel" error={errors.mobile?.message} {...register('mobile')} />
            <Input label="Email" required type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Website" wrapperClassName="sm:col-span-2" placeholder="www.example.com" error={errors.website?.message} {...register('website')} />
          </section>
        </div>

        <div className={cn('mx-auto max-w-3xl space-y-5', tab !== 'financial' && 'hidden')}>
          <section className="card grid gap-4 p-5 sm:grid-cols-2">
            <Select label="Default GST rate" hint="Used for transport / other charges on new quotes" {...register('defaultGstPercent', num)}>
              {GST_SLABS.map((g) => <option key={g} value={g}>{g}%</option>)}
            </Select>
            <span className="hidden sm:block" />
            <Input label="Account holder name" error={errors.accountName?.message} {...register('accountName')} />
            <Input label="Bank name" error={errors.bankName?.message} {...register('bankName')} />
            <Input label="Account number" inputMode="numeric" error={errors.accountNumber?.message} {...register('accountNumber')} />
            <Input label="IFSC" className="uppercase" error={errors.ifsc?.message} {...register('ifsc')} />
            <Input label="Branch" error={errors.bankBranch?.message} {...register('bankBranch')} />
            <Input label="UPI ID" placeholder="name@bank" error={errors.upiId?.message} {...register('upiId')} />
          </section>
        </div>

        <div className={cn('mx-auto max-w-3xl space-y-5', tab !== 'quotation' && 'hidden')}>
          <section className="card grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Quotation number prefix" hint="e.g. QT → QT-2026-00125" className="uppercase" error={errors.quotePrefix?.message} {...register('quotePrefix')} />
            <Input label="Validity (days)" type="number" inputMode="numeric" error={errors.validityDays?.message} {...register('validityDays', num)} />
            <Textarea label="Default warranty" rows={3} wrapperClassName="sm:col-span-2" error={errors.defaultWarranty?.message} {...register('defaultWarranty')} />
            <Input label="Signatory name" error={errors.signatoryName?.message} {...register('signatoryName')} />
            <Input label="Signatory title" placeholder="Authorized Signatory" error={errors.signatoryTitle?.message} {...register('signatoryTitle')} />
          </section>
          <p className="text-sm text-ink-muted">Default payment terms, scope of work and terms & conditions live under the <button type="button" className="font-semibold text-brand-600 underline" onClick={() => setTab('templates')}>Templates</button> tab.</p>
        </div>

        {isFormTab && (
          <div className="safe-bottom sticky bottom-[4.75rem] z-20 mx-auto mt-6 flex max-w-3xl items-center justify-end gap-2 rounded-xl2 border border-surface-line bg-white/95 p-2.5 shadow-lift backdrop-blur lg:bottom-4">
            {isDirty && <span className="mr-auto pl-2 text-sm text-ink-muted">Unsaved changes</span>}
            <Button variant="secondary" disabled={!isDirty} onClick={() => reset(toForm(settings))}>Discard</Button>
            <Button type="submit" loading={save.isPending} disabled={!isDirty}>Save settings</Button>
          </div>
        )}
      </form>

      {tab === 'templates' && <TemplatesTab />}
      {tab === 'users' && <UsersTab />}
    </>
  );
}
