import { Router } from 'express';
import type { Prisma, Product } from '@prisma/client';
import type { ProductDTO } from '@pool-quote/shared';
import { PRODUCT_CATEGORIES, productSchema } from '@pool-quote/shared';
import { badRequest, notFound } from '../../lib/errors';
import { emptyToNull, num, param, parse } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/authenticate';
import { assetUrl, imageUpload, storeAsset } from '../assets/assets.routes';

export const productsRouter = Router();

export const toProductDTO = (p: Product): ProductDTO => ({
  id: p.id,
  name: p.name,
  description: p.description,
  category: p.category,
  brand: p.brand,
  model: p.model,
  unit: p.unit,
  price: num(p.price),
  gstPercent: num(p.gstPercent),
  imageUrl: assetUrl(p.imageId),
  isActive: p.isActive,
});

const toData = (input: ReturnType<typeof productSchema.parse>) => ({
  name: input.name,
  description: emptyToNull(input.description),
  category: input.category,
  brand: emptyToNull(input.brand),
  model: emptyToNull(input.model),
  unit: input.unit,
  price: input.price,
  gstPercent: input.gstPercent,
  isActive: input.isActive,
});

productsRouter.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const category = PRODUCT_CATEGORIES.find((c) => c === req.query.category);
  // Sales users only ever see active items; admins can opt in to inactive ones to manage them.
  const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'ADMIN';

  const where: Prisma.ProductWhereInput = {
    ...(includeInactive ? {} : { isActive: true }),
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const products = await prisma.product.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json({ data: products.map(toProductDTO) });
});

productsRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const product = await prisma.product.create({ data: toData(parse(productSchema, req.body)) });
  res.status(201).json(toProductDTO(product));
});

productsRouter.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = param(req.params.id);
  const input = parse(productSchema, req.body);
  if (!(await prisma.product.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Product');
  const product = await prisma.product.update({ where: { id }, data: toData(input) });
  res.json(toProductDTO(product));
});

/** Products already used on quotes are archived (isActive=false) rather than deleted. */
productsRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = param(req.params.id);
  const product = await prisma.product.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
  if (!product) throw notFound('Product');
  if (product._count.items > 0) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    res.json({ archived: true });
    return;
  }
  await prisma.product.delete({ where: { id } });
  res.json({ archived: false });
});

/** Multipart field "file" (PNG / JPG / WebP, max 2 MB). */
productsRouter.post('/:id/image', requireRole('ADMIN'), imageUpload.single('file'), async (req, res) => {
  const id = param(req.params.id);
  if (!req.file) throw badRequest('Choose an image to upload.');
  if (!(await prisma.product.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Product');
  const imageId = await storeAsset(req.file);
  const product = await prisma.product.update({ where: { id }, data: { imageId } });
  res.json(toProductDTO(product));
});

productsRouter.delete('/:id/image', requireRole('ADMIN'), async (req, res) => {
  const id = param(req.params.id);
  if (!(await prisma.product.findUnique({ where: { id }, select: { id: true } }))) throw notFound('Product');
  const product = await prisma.product.update({ where: { id }, data: { imageId: null } });
  res.json(toProductDTO(product));
});
