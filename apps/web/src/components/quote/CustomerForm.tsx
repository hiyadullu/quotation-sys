import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { customerSchema, type CustomerDTO, type CustomerInput } from '@pool-quote/shared';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Field';

interface CustomerFormProps {
  customer?: CustomerDTO;
  submitLabel?: string;
  loading?: boolean;
  onSubmit: (values: CustomerInput) => void | Promise<void>;
  onCancel?: () => void;
  formId?: string;
  hideActions?: boolean;
}

export function CustomerForm({ customer, submitLabel = 'Save customer', loading, onSubmit, onCancel, formId, hideActions }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? '',
      mobile: customer?.mobile ?? '',
      email: customer?.email ?? '',
      address: customer?.address ?? '',
      siteAddress: customer?.siteAddress ?? '',
      city: customer?.city ?? '',
      gstin: customer?.gstin ?? '',
    },
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      <Input label="Customer name" required wrapperClassName="sm:col-span-2" autoComplete="off" error={errors.name?.message} {...register('name')} />
      <Input label="Mobile number" required inputMode="tel" placeholder="98765 43210" error={errors.mobile?.message} {...register('mobile')} />
      <Input label="Email" type="email" inputMode="email" error={errors.email?.message} {...register('email')} />
      <Textarea label="Customer address" rows={2} wrapperClassName="sm:col-span-2" error={errors.address?.message} {...register('address')} />
      <Textarea label="Project / site address" rows={2} wrapperClassName="sm:col-span-2" error={errors.siteAddress?.message} {...register('siteAddress')} />
      <Input label="City" error={errors.city?.message} {...register('city')} />
      <Input label="GST number" hint="Optional" className="uppercase" error={errors.gstin?.message} {...register('gstin')} />
      {!hideActions && (
        <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
          {onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" loading={loading}>{submitLabel}</Button>
        </div>
      )}
    </form>
  );
}
