import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface ImageUploadProps {
  label: string;
  hint?: string;
  url: string | null | undefined;
  /** Local preview for a file chosen but not uploaded yet. */
  pendingFile?: File | null;
  busy?: boolean;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  className?: string;
}

export function ImageUpload({ label, hint, url, pendingFile, busy, onSelect, onRemove, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = pendingFile ? URL.createObjectURL(pendingFile) : url;

  return (
    <div className={className}>
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      <div className="flex items-center gap-4">
        <div className={cn('flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-surface-line bg-surface-alt', preview && 'border-solid bg-white')}>
          {preview ? <img src={preview} alt={`${label} preview`} className="h-full w-full object-contain p-1" /> : <ImagePlus className="h-6 w-6 text-ink-faint" />}
        </div>
        <div className="space-y-2">
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={`Upload ${label}`}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ''; }} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>{preview ? 'Replace' : 'Upload'}</Button>
            {preview && onRemove && <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} onClick={onRemove}>Remove</Button>}
          </div>
          <p className="text-xs text-ink-muted">{hint ?? 'PNG, JPG or WebP · max 2 MB'}</p>
        </div>
      </div>
    </div>
  );
}
