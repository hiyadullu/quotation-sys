import { useCallback, useEffect, useRef, useState } from 'react';
import { Skeleton } from '../ui/Feedback';

const PAGE_WIDTH = 794; // A4 at 96 dpi; the server renders the document at exactly this width.

interface QuotePreviewFrameProps {
  quoteId: string;
  /** Changes whenever the quote is saved, forcing the frame to reload. */
  version: string;
}

/**
 * Shows the server-rendered quotation — the same HTML the PDF is made from — scaled to fit
 * the available width, so what you preview is what the customer receives.
 */
export function QuotePreviewFrame({ quoteId, version }: QuotePreviewFrameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(1123);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / PAGE_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const measure = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (doc?.body) setHeight(Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight));
    setLoaded(true);
  }, []);

  useEffect(() => setLoaded(false), [quoteId, version]);

  return (
    <div ref={wrapperRef} className="relative w-full overflow-hidden rounded-xl border border-surface-line bg-white shadow-card" style={{ height: height * scale }}>
      {!loaded && <Skeleton className="absolute inset-0 h-full min-h-[24rem] rounded-none" />}
      <iframe
        ref={frameRef}
        key={`${quoteId}-${version}`}
        title="Quotation preview"
        src={`/api/quotes/${quoteId}/preview?v=${encodeURIComponent(version)}`}
        onLoad={measure}
        scrolling="no"
        sandbox="allow-same-origin"
        style={{ width: PAGE_WIDTH, height, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0, opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}
