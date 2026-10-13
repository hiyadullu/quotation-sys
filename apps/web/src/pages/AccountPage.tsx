import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ROLE_LABELS, changePasswordSchema, type ChangePasswordInput } from '@pool-quote/shared';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { api, errorMessage } from '@/lib/api';
import { initials } from '@/lib/format';

export default function AccountPage() {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '' } });

  const change = useMutation({
    mutationFn: (input: ChangePasswordInput) => api.post('/auth/change-password', input),
    onSuccess: () => { toast.success('Password updated'); reset(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!user) return null;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="My account" />
      <section className="card mb-5 flex items-center gap-4 p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-800">{initials(user.name)}</span>
        <div>
          <p className="text-lg font-bold">{user.name}</p>
          <p className="text-sm text-ink-muted">{user.email} · {ROLE_LABELS[user.role]}</p>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="mb-4 text-base font-bold">Change password</h2>
        <form onSubmit={handleSubmit((v) => change.mutate(v))} noValidate className="space-y-4">
          <Input label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
          <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." error={errors.newPassword?.message} {...register('newPassword')} />
          <Button type="submit" loading={change.isPending}>Update password</Button>
        </form>
      </section>
    </div>
  );
}
