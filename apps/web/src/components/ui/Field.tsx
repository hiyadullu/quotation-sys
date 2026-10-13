import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface ShellProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  htmlFor: string;
  children: ReactNode;
}

function FieldShell({ label, error, hint, required, className, htmlFor, children }: ShellProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-soft">
          {label}
          {required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

interface CommonProps {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, CommonProps & InputHTMLAttributes<HTMLInputElement>>(function Input(
  { label, error, hint, wrapperClassName, className, required, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={wrapperClassName} htmlFor={id}>
      <input ref={ref} id={id} required={false} aria-invalid={!!error} className={cn('input', error && 'input-error', className)} {...rest} />
    </FieldShell>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { label, error, hint, wrapperClassName, className, required, rows = 4, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={wrapperClassName} htmlFor={id}>
      <textarea ref={ref} id={id} rows={rows} aria-invalid={!!error} className={cn('input resize-y leading-relaxed', error && 'input-error', className)} {...rest} />
    </FieldShell>
  );
});

export const Select = forwardRef<HTMLSelectElement, CommonProps & SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { label, error, hint, wrapperClassName, className, required, children, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={wrapperClassName} htmlFor={id}>
      <select ref={ref} id={id} aria-invalid={!!error} className={cn('input appearance-auto pr-8', error && 'input-error', className)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});
