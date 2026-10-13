import { Router } from 'express';
import type { Customer } from '@prisma/client';
import type { CustomerDTO } from '@pool-quote/shared';
import { customerSchema, normalizeMobile } from '@pool-quote/shared';
import { conflict, notFound } from '../../lib/errors';
import { emptyToNull, param, parse } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { currentUser } from '../../middleware/authenticate';

export const customersRouter = Router();

const toDTO = (c: Customer & { _count?: { quotes: number } }): CustomerDTO => ({
  id: c.id,
  name: c.name,
  mobile: c.mobile,
  email: c.email,
  address: c.address,
  siteAddress: c.siteAddress,
  city: c.city,
  gstin: c.gstin,
  createdAt: c.createdAt.toISOString(),
  ...(c._count ? { quoteCount: c._count.quotes } : {}),
});

function toData(input: ReturnType<typeof customerSchema.parse>) {
  return {
    name: input.name,
    mobile: normalizeMobile(input.mobile) ?? input.mobile,
    email: emptyToNull(input.email),
    address: emptyToNull(input.address),
    siteAddress: emptyToNull(input.siteAddress),
    city: emptyToNull(input.city),
    gstin: emptyToNull(input.gstin),
  };
}

customersRouter.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const digits = search.replace(/\D/g, '');

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            ...(digits.length >= 3 ? [{ mobile: { contains: digits } }] : []),
          ],
        }
      : undefined,
    include: { _count: { select: { quotes: true } } },
    orderBy: { name: 'asc' },
    take: limit,
  });
  res.json({ data: customers.map(toDTO) });
});

customersRouter.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: param(req.params.id) },
    include: { _count: { select: { quotes: true } } },
  });
  if (!customer) throw notFound('Customer');
  res.json(toDTO(customer));
});

customersRouter.post('/', async (req, res) => {
  const input = parse(customerSchema, req.body);
  const customer = await prisma.customer.create({
    data: { ...toData(input), createdById: currentUser(req).id },
  });
  res.status(201).json(toDTO(customer));
});

customersRouter.put('/:id', async (req, res) => {
  const id = param(req.params.id);
  const input = parse(customerSchema, req.body);
  if (!(await prisma.customer.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Customer');
  const customer = await prisma.customer.update({ where: { id }, data: toData(input) });
  res.json(toDTO(customer));
});

customersRouter.delete('/:id', async (req, res) => {
  const id = param(req.params.id);
  const customer = await prisma.customer.findUnique({ where: { id }, include: { _count: { select: { quotes: true } } } });
  if (!customer) throw notFound('Customer');
  if (customer._count.quotes > 0) throw conflict('This customer has quotations and cannot be deleted.');
  await prisma.customer.delete({ where: { id } });
  res.status(204).end();
});
