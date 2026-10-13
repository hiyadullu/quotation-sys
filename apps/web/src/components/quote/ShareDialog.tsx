import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, ExternalLink, Mail, MessageCircle, Paperclip, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatMobile, type QuoteDTO } from '@pool-quote/shared';
import { api, errorMessage } from '@/lib/api';
import { keys, useShareDefaults } from '@/lib/queries';
import { invalidateQuoteData } from '@/lib/quoteActions';
import { Button } from '../ui/Button';
import { Alert, Spinner } from '../ui/Feedback';
import { Input, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';

interface ShareDialogProps {
  quote: QuoteDTO;
  channel: 'whatsapp' | 'email' | null;
  onClose: () => void;
}

export function ShareDialog({ quote, channel, onClose }: ShareDialogProps) {
  const open = channel !== null;
  const qc = useQueryClient();
  const { data: defaults, isLoading, error } = useShareDefaults(quote.id, open);

  const [message, setMessage] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!defaults) return;
    setMessage(defaults.whatsapp.message);
    setTo(defaults.email.to);
    setSubject(defaults.email.subject);
    setBody(defaults.email.body);
  }, [defaults]);

  const afterShare = async (updated: QuoteDTO) => {
    qc.setQueryData(keys.quote(updated.id), updated);
    await invalidateQuoteData(qc);
  };

  const recordWhatsApp = useMutation({
    mutationFn: () => api.post<QuoteDTO>(`/quotes/${quote.id}/share/whatsapp`),
    onSuccess: afterShare,
    onError: (e) => toast.error(errorMessage(e)),
  });

  const sendEmail = useMutation({
    mutationFn: () => api.post<QuoteDTO>(`/quotes/${quote.id}/share/email`, { to, subject, body }),
    onSuccess: async (updated) => {
      await afterShare(updated);
      toast.success(`Quotation emailed to ${to}`);
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const openWhatsApp = () => {
    if (!defaults) return;
    // Opened synchronously from the click so mobile browsers don't treat it as a pop-up.
    window.open(`https://wa.me/${defaults.whatsapp.phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    recordWhatsApp.mutate();
    onClose();
  };

  const canShareFile = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && typeof navigator.share === 'function';
  const sharePdfFile = async () => {
    if (!defaults) return;
    try {
      const res = await fetch(`/api/quotes/${quote.id}/pdf`);
      if (!res.ok) throw new Error('Could not prepare the PDF.');
      const file = new File([await res.blob()], defaults.pdfFileName, { type: 'application/pdf' });
      if (!navigator.canShare({ files: [file] })) throw new Error('Your browser cannot share files. Use “Open WhatsApp chat” instead.');
      await navigator.share({ files: [file], text: message });
      recordWhatsApp.mutate();
      onClose();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error(errorMessage(e));
    }
  };

  const title = channel === 'email' ? 'Email quotation' : 'Send on WhatsApp';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={`${quote.displayNumber} · ${quote.customer.name}`}
      size="md"
      footer={
        channel === 'email' ? (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button icon={<Mail className="h-4 w-4" />} loading={sendEmail.isPending} disabled={!defaults?.email.smtpConfigured || !to || !subject || !body} onClick={() => sendEmail.mutate()}>Send email</Button>
          </>
        ) : (
          <>
            {canShareFile && <Button variant="secondary" icon={<Share2 className="h-4 w-4" />} onClick={() => void sharePdfFile()} disabled={!defaults}>Share PDF file</Button>}
            <Button variant="success" icon={<MessageCircle className="h-4 w-4" />} onClick={openWhatsApp} disabled={!defaults || !message.trim()}>Open WhatsApp chat</Button>
          </>
        )
      }
    >
      {isLoading && <div className="flex justify-center py-10"><Spinner className="h-6 w-6" /></div>}
      {error && <Alert tone="error">{errorMessage(error)}</Alert>}

      {defaults && channel === 'whatsapp' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-surface-alt px-3.5 py-2.5 text-sm">
            <span className="text-ink-muted">To</span>
            <span className="font-semibold">{quote.customer.name} · {formatMobile(`+${defaults.whatsapp.phone}`)}</span>
          </div>
          <Textarea label="Message" rows={9} value={message} onChange={(e) => setMessage(e.target.value)} hint="You can edit this before sending. The link lets your customer open the PDF directly." />
          <a href={`/api/quotes/${quote.id}/pdf?download=1`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"><Download className="h-4 w-4" />Download the PDF to attach manually</a>
        </div>
      )}

      {defaults && channel === 'email' && (
        <div className="space-y-4">
          {!defaults.email.smtpConfigured && <Alert>Email is not set up yet. Add the SMTP_* values to your <code>.env</code> file and restart the server.</Alert>}
          <Input label="To" type="email" inputMode="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com" hint={!to ? 'This customer has no email on file — type one in, or add it to the customer record.' : undefined} />
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea label="Message" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex items-center gap-2 rounded-lg border border-surface-line bg-surface-alt px-3 py-2.5 text-sm">
            <Paperclip className="h-4 w-4 text-ink-muted" />
            <span className="truncate font-medium">{defaults.pdfFileName}</span>
            <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-ink-muted">attached automatically <ExternalLink className="h-3 w-3" /></span>
          </div>
        </div>
      )}
    </Modal>
  );
}
