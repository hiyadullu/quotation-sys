import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, FileCheck2, MessageCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@pool-quote/shared';
import { useAuth } from '@/auth/AuthContext';
import { Alert } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { api, errorMessage } from '@/lib/api';

interface Branding {
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
}

const WAVES = (
  <svg viewBox="0 0 800 600" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
    <defs>
      <linearGradient id="w1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#14a9c0" stopOpacity=".35" />
        <stop offset="1" stopColor="#0c6aa6" stopOpacity=".05" />
      </linearGradient>
    </defs>
    {[0, 1, 2, 3, 4].map((i) => (
      <path
        key={i}
        d={`M0 ${330 + i * 50} C 120 ${290 + i * 50}, 220 ${380 + i * 50}, 360 ${335 + i * 50} S 620 ${290 + i * 50}, 800 ${340 + i * 50} V600 H0 Z`}
        fill="url(#w1)"
        opacity={0.9 - i * 0.12}
      />
    ))}
  </svg>
);

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: () => api.get<Branding>('/public/branding'),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } });

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
  if (user) return <Navigate to={redirectTo} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative isolate hidden overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {WAVES}
        <div className="relative z-10 flex items-center gap-3">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
          ) : (
            <img src="/favicon.svg" alt="" className="h-11 w-11 rounded-xl" />
          )}
          <span className="font-display text-xl font-extrabold">{branding?.companyName ?? 'Pool Quotation'}</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-white">Professional quotations in minutes, not hours.</h2>
          <p className="mt-4 text-lg text-brand-100">Price the job, generate a branded PDF and send it to your customer on WhatsApp or email — all from one place.</p>
          <ul className="mt-9 space-y-4 text-[15px]">
            {[
              [FileCheck2, 'Accurate GST-ready pricing', 'Totals, discounts and tax are calculated for you.'],
              [MessageCircle, 'One-tap sharing', 'WhatsApp and email with the PDF attached.'],
              [ShieldCheck, 'Every quote saved & tracked', 'Duplicate or revise any quotation, with full history.'],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof FileCheck2;
              return (
                <li key={title as string} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/20"><I className="h-[18px] w-[18px]" /></span>
                  <span><span className="block font-semibold text-white">{title as string}</span><span className="text-brand-100">{body as string}</span></span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative z-10 text-sm text-brand-200">{branding?.tagline ?? 'Swimming pool construction & equipment'}</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            {branding?.logoUrl ? <img src={branding.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" /> : <img src="/favicon.svg" alt="" className="h-10 w-10 rounded-lg" />}
            <span className="font-display text-lg font-extrabold text-brand-900">{branding?.companyName ?? 'Pool Quotation'}</span>
          </div>
          <h1 className="text-3xl font-extrabold">Welcome back</h1>
          <p className="mt-1.5 text-ink-muted">Sign in to create and manage quotations.</p>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            {serverError && <Alert tone="error">{serverError}</Alert>}
            <Input
              label="Email or mobile number"
              autoComplete="username"
              inputMode="email"
              autoFocus
              error={errors.identifier?.message}
              {...register('identifier')}
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-11"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-[31px] rounded-md p-1.5 text-ink-muted hover:text-ink"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Sign in</Button>
          </form>
          <p className="mt-8 text-center text-sm text-ink-muted">Forgot your password? Ask your administrator to reset it.</p>
        </div>
      </section>
    </div>
  );
}
