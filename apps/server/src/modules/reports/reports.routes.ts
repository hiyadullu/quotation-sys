import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { DashboardDTO, ReportDTO } from '@pool-quote/shared';
import { fromDateString, toDateString } from '../../lib/dates';
import { num, parse } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { currentUser, requireRole } from '../../middleware/authenticate';
import { summaryInclude, toSummaryDTO } from '../quotes/quotes.mapper';
import { accessFilter } from '../quotes/quotes.service';

export const reportsRouter = Router();

reportsRouter.get('/dashboard', async (req, res) => {
  const user = currentUser(req);
  const base: Prisma.QuoteWhereInput = { isLatest: true, ...accessFilter(user) };

  const [created, sent, accepted, pending, recent, customerCount, productCount] = await Promise.all([
    prisma.quote.count({ where: base }),
    prisma.quote.count({ where: { ...base, sentAt: { not: null } } }),
    prisma.quote.count({ where: { ...base, status: 'ACCEPTED' } }),
    prisma.quote.count({ where: { ...base, status: 'SENT' } }),
    prisma.quote.findMany({ where: base, include: summaryInclude, orderBy: { updatedAt: 'desc' }, take: 6 }),
    prisma.customer.count(),
    prisma.product.count({ where: { isActive: true } }),
  ]);

  const body: DashboardDTO = { created, sent, accepted, pending, recent: recent.map(toSummaryDTO), customerCount, productCount };
  res.json(body);
});

const reportQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Company-wide figures, so admin only. */
reportsRouter.get('/reports', requireRole('ADMIN'), async (req, res) => {
  const { from, to } = parse(reportQuery, req.query);
  const where: Prisma.QuoteWhereInput = {
    isLatest: true,
    ...(from || to
      ? { issueDate: { ...(from ? { gte: fromDateString(from) } : {}), ...(to ? { lte: fromDateString(to) } : {}) } }
      : {}),
  };

  const rows = await prisma.quote.findMany({ where, select: { status: true, total: true, issueDate: true, sentAt: true } });

  let totalValue = 0;
  let acceptedValue = 0;
  const counts = { sent: 0, accepted: 0, rejected: 0, draft: 0 };
  const months = new Map<string, { count: number; value: number }>();

  for (const row of rows) {
    const value = num(row.total);
    totalValue += value;
    if (row.sentAt) counts.sent += 1;
    if (row.status === 'ACCEPTED') {
      counts.accepted += 1;
      acceptedValue += value;
    } else if (row.status === 'REJECTED') counts.rejected += 1;
    else if (row.status === 'DRAFT') counts.draft += 1;

    const month = toDateString(row.issueDate).slice(0, 7);
    const bucket = months.get(month) ?? { count: 0, value: 0 };
    bucket.count += 1;
    bucket.value += value;
    months.set(month, bucket);
  }

  const body: ReportDTO = {
    from: from ?? null,
    to: to ?? null,
    totalQuotes: rows.length,
    totalValue: Math.round(totalValue * 100) / 100,
    ...counts,
    acceptedValue: Math.round(acceptedValue * 100) / 100,
    conversionRate: counts.sent ? Math.round((counts.accepted / counts.sent) * 1000) / 10 : 0,
    byMonth: [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, count: v.count, value: Math.round(v.value * 100) / 100 })),
  };
  res.json(body);
});
