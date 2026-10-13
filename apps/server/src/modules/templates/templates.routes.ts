import { Router } from 'express';
import type { Template } from '@prisma/client';
import type { Milestone, TemplateDTO } from '@pool-quote/shared';
import { TEMPLATE_KINDS, templateSchema } from '@pool-quote/shared';
import { notFound } from '../../lib/errors';
import { param, parse } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/authenticate';

export const templatesRouter = Router();

export const toTemplateDTO = (t: Template): TemplateDTO => ({
  id: t.id,
  kind: t.kind,
  name: t.name,
  body: t.body,
  milestones: (t.milestones as Milestone[] | null) ?? null,
  isDefault: t.isDefault,
});

templatesRouter.get('/', async (req, res) => {
  const kind = TEMPLATE_KINDS.find((k) => k === req.query.kind);
  const templates = await prisma.template.findMany({
    where: kind ? { kind } : undefined,
    orderBy: [{ kind: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
  });
  res.json({ data: templates.map(toTemplateDTO) });
});

function toData(input: ReturnType<typeof templateSchema.parse>) {
  const isPayment = input.kind === 'PAYMENT';
  return {
    kind: input.kind,
    name: input.name,
    body: isPayment ? null : (input.body?.trim() ?? ''),
    milestones: isPayment ? input.milestones : undefined,
    isDefault: input.isDefault,
  };
}

/** Only one default per kind: setting a new default clears the previous one. */
templatesRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const input = parse(templateSchema, req.body);
  const created = await prisma.$transaction(async (tx) => {
    if (input.isDefault) await tx.template.updateMany({ where: { kind: input.kind }, data: { isDefault: false } });
    return tx.template.create({ data: toData(input) });
  });
  res.status(201).json(toTemplateDTO(created));
});

templatesRouter.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = param(req.params.id);
  const input = parse(templateSchema, req.body);
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) throw notFound('Template');

  const updated = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.template.updateMany({ where: { kind: input.kind, NOT: { id } }, data: { isDefault: false } });
    }
    return tx.template.update({ where: { id }, data: toData(input) });
  });
  res.json(toTemplateDTO(updated));
});

templatesRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = param(req.params.id);
  if (!(await prisma.template.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Template');
  await prisma.template.delete({ where: { id } });
  res.status(204).end();
});
