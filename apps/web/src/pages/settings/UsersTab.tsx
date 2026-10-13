import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ROLES, ROLE_LABELS, formatMobile, userCreateSchema, userUpdateSchema, type UserCreateInput, type UserDTO, type UserUpdateInput } from '@pool-quote/shared';
import { useAuth } from '@/auth/AuthContext';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api';
import { initials } from '@/lib/format';
import { keys, useUsers } from '@/lib/queries';

export function UsersTab() {
  const { data: users, isLoading } = useUsers();
  const { user: me } = useAuth();
  const [editing, setEditing] = useState<UserDTO | 'new' | null>(null);

  return (
    <div className="mx-auto max-w-3xl">
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-surface-line p-4">
          <div>
            <h2 className="text-base font-bold">Team</h2>
            <p className="mt-0.5 text-sm text-ink-muted">Sales executives see only their own quotations. Admins see everything.</p>
          </div>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Add user</Button>
        </div>
        {isLoading ? <div className="space-y-3 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : (
          <ul className="divide-y divide-surface-line">
            {users?.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{initials(u.name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{u.name}</span>
                    {u.id === me?.id && <Pill>You</Pill>}
                    <Pill tone={u.role === 'ADMIN' ? 'brand' : 'neutral'}>{ROLE_LABELS[u.role]}</Pill>
                    {!u.isActive && <Pill tone="warn">Inactive</Pill>}
                  </div>
                  <p className="truncate text-sm text-ink-muted">{u.email}{u.mobile ? ` · ${formatMobile(u.mobile)}` : ''}</p>
                </div>
                <Button variant="ghost" size="sm" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}><Pencil className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {editing !== null && <UserModal user={editing === 'new' ? null : editing} isSelf={editing !== 'new' && editing.id === me?.id} onClose={() => setEditing(null)} />}
    </div>
  );
}

type UserForm = UserCreateInput & Partial<Pick<UserUpdateInput, 'isActive'>>;

function UserModal({ user, isSelf, onClose }: { user: UserDTO | null; isSelf: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(user ? userUpdateSchema : userCreateSchema) as never,
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', mobile: user?.mobile ?? '', role: user?.role ?? 'SALES', password: '', isActive: user?.isActive ?? true },
  });

  const save = useMutation({
    mutationFn: (input: UserForm) => (user ? api.put<UserDTO>(`/users/${user.id}`, input) : api.post<UserDTO>('/users', input)),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: keys.users }); toast.success(user ? 'User updated' : 'User added'); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Modal open onClose={onClose} title={user ? 'Edit user' : 'Add user'} size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="user-form" loading={save.isPending}>Save user</Button></>}>
      <form id="user-form" onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" required wrapperClassName="sm:col-span-2" error={errors.name?.message} {...register('name')} />
        <Input label="Email" required type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Mobile" inputMode="tel" hint="Can also be used to sign in" error={errors.mobile?.message} {...register('mobile')} />
        <Select label="Role" disabled={isSelf} {...register('role')}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </Select>
        <Input label={user ? 'New password' : 'Password'} required={!user} type="password" autoComplete="new-password" hint={user ? 'Leave blank to keep the current password' : 'At least 8 characters'} error={errors.password?.message} {...register('password')} />
        {user && (
          <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2">
            <input type="checkbox" disabled={isSelf} className="h-4 w-4 rounded border-surface-line text-brand-600" {...register('isActive')} /> Account is active
          </label>
        )}
      </form>
    </Modal>
  );
}
