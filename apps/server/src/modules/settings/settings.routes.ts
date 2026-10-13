import { Router } from 'express';
import multer from 'multer';
import { normalizeMobile, settingsSchema } from '@pool-quote/shared';
import { badRequest } from '../../lib/errors';
import { emptyToNull, parse } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/authenticate';
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, storeAsset } from '../assets/assets.routes';
import { SETTINGS_ID, getSettings, toSettingsDTO } from './settings.service';

export const settingsRouter = Router();

/** Everyone signed in can read settings (the quote editor needs defaults); only admins change them. */
settingsRouter.get('/', async (_req, res) => {
  res.json(toSettingsDTO(await getSettings()));
});

settingsRouter.put('/', requireRole('ADMIN'), async (req, res) => {
  const input = parse(settingsSchema, req.body);
  await getSettings();
  const updated = await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: {
      companyName: input.companyName,
      tagline: emptyToNull(input.tagline),
      address: input.address,
      city: emptyToNull(input.city),
      state: emptyToNull(input.state),
      pincode: emptyToNull(input.pincode),
      gstin: emptyToNull(input.gstin),
      mobile: normalizeMobile(input.mobile) ?? input.mobile,
      email: input.email,
      website: emptyToNull(input.website),
      defaultGstPercent: input.defaultGstPercent,
      bankName: emptyToNull(input.bankName),
      accountName: emptyToNull(input.accountName),
      accountNumber: emptyToNull(input.accountNumber),
      ifsc: emptyToNull(input.ifsc?.toUpperCase()),
      bankBranch: emptyToNull(input.bankBranch),
      upiId: emptyToNull(input.upiId),
      quotePrefix: input.quotePrefix,
      validityDays: input.validityDays,
      defaultWarranty: emptyToNull(input.defaultWarranty),
      signatoryName: emptyToNull(input.signatoryName),
      signatoryTitle: emptyToNull(input.signatoryTitle),
    },
  });
  res.json(toSettingsDTO(updated));
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED_IMAGE_TYPES.includes(file.mimetype) ? cb(null, true) : cb(badRequest('Upload a PNG, JPG or WebP image.')),
});

/** POST /settings/logo and /settings/signature (multipart field "file"). */
for (const [slug, column] of [
  ['logo', 'logoId'],
  ['signature', 'signatureId'],
] as const) {
  settingsRouter.post(`/${slug}`, requireRole('ADMIN'), upload.single('file'), async (req, res) => {
    if (!req.file) throw badRequest('Choose an image to upload.');
    await getSettings();
    const assetId = await storeAsset(req.file);
    const updated = await prisma.settings.update({ where: { id: SETTINGS_ID }, data: { [column]: assetId } });
    res.json(toSettingsDTO(updated));
  });

  settingsRouter.delete(`/${slug}`, requireRole('ADMIN'), async (_req, res) => {
    await getSettings();
    const updated = await prisma.settings.update({ where: { id: SETTINGS_ID }, data: { [column]: null } });
    res.json(toSettingsDTO(updated));
  });
}
