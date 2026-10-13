import { Router } from 'express';
import multer from 'multer';
import { badRequest, notFound } from '../../lib/errors';
import { param } from '../../lib/http';
import { prisma } from '../../lib/prisma';

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export const assetUrl = (id: string | null | undefined): string | null => (id ? `/api/assets/${id}` : null);

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    // SVG is deliberately excluded: it can carry scripts.
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(badRequest('Upload a PNG, JPG or WebP image.'));
  },
});

/** Public-by-id image delivery (ids are unguessable cuids); needed by <img> tags and the PDF renderer. */
export const assetsPublicRouter = Router();

assetsPublicRouter.get('/:id', async (req, res) => {
  const asset = await prisma.asset.findUnique({ where: { id: param(req.params.id) } });
  if (!asset) throw notFound('Image');
  res.setHeader('Content-Type', asset.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(Buffer.from(asset.data));
});

export async function storeAsset(file: Express.Multer.File): Promise<string> {
  const asset = await prisma.asset.create({
    data: { mimeType: file.mimetype, size: file.size, data: new Uint8Array(file.buffer) },
    select: { id: true },
  });
  return asset.id;
}
