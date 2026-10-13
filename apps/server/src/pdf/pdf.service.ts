import puppeteer, { type Browser } from 'puppeteer';
import { env } from '../config/env';
import { serviceUnavailable } from '../lib/errors';
import { logger } from '../lib/logger';

let browserPromise: Promise<Browser> | null = null;

function launch(): Promise<Browser> {
  const promise = puppeteer.launch({
    headless: true,
    executablePath: env.PUPPETEER_EXECUTABLE_PATH || undefined,
    // The sandbox flags are required when running as root in Docker. Only our own,
    // fully-escaped HTML is ever rendered, and all network access is blocked below.
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  promise
    .then((browser) =>
      browser.on('disconnected', () => {
        if (browserPromise === promise) browserPromise = null;
      }),
    )
    .catch((err) => {
      logger.error({ err }, 'Could not start Chrome for PDF rendering');
      if (browserPromise === promise) browserPromise = null;
    });
  return promise;
}

async function getBrowser(): Promise<Browser> {
  browserPromise ??= launch();
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const pending = browserPromise;
  browserPromise = null;
  await pending.then((b) => b.close()).catch(() => undefined);
}

const footerTemplate = (label: string) => `
  <div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:7.5px;color:#5d6b7a;padding:0 12mm;display:flex;justify-content:space-between">
    <span>${label}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;

/** Small LRU so "Generate", "Download" and "Email" in quick succession render only once. */
const cache = new Map<string, Buffer>();
const CACHE_LIMIT = 24;

export async function renderPdf(html: string, footerLabel: string, cacheKey: string): Promise<Buffer> {
  const hit = cache.get(cacheKey);
  if (hit) {
    cache.delete(cacheKey);
    cache.set(cacheKey, hit);
    return hit;
  }

  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (err) {
    logger.error({ err }, 'Chrome launch failed');
    throw serviceUnavailable(
      'The PDF engine is not available. Check that Chrome is installed for Puppeteer (see README → Troubleshooting).',
    );
  }

  const page = await browser.newPage();
  try {
    // The document is self-contained (fonts and images are inlined): refuse anything else.
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('data:') || url === 'about:blank') void request.continue();
      else void request.abort();
    });

    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: footerTemplate(footerLabel),
      margin: { top: '12mm', bottom: '16mm', left: '12mm', right: '12mm' },
    });
    const buffer = Buffer.from(pdf);

    cache.set(cacheKey, buffer);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    return buffer;
  } finally {
    await page.close().catch(() => undefined);
  }
}
