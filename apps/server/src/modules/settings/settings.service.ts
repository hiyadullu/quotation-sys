import type { Settings } from '@prisma/client';
import type { SettingsDTO } from '@pool-quote/shared';
import { num } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { assetUrl } from '../assets/assets.routes';

export const SETTINGS_ID = 1;

export async function getSettings(): Promise<Settings> {
  const settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  if (settings) return settings;
  // First run before seeding: create a usable placeholder row.
  return prisma.settings.create({
    data: {
      id: SETTINGS_ID,
      companyName: 'Your Pool Company',
      address: 'Add your address in Settings',
      mobile: '+910000000000',
      email: 'info@example.com',
    },
  });
}

export const toSettingsDTO = (s: Settings): SettingsDTO => ({
  companyName: s.companyName,
  tagline: s.tagline,
  address: s.address,
  city: s.city,
  state: s.state,
  pincode: s.pincode,
  gstin: s.gstin,
  mobile: s.mobile,
  email: s.email,
  website: s.website,
  defaultGstPercent: num(s.defaultGstPercent),
  bankName: s.bankName,
  accountName: s.accountName,
  accountNumber: s.accountNumber,
  ifsc: s.ifsc,
  bankBranch: s.bankBranch,
  upiId: s.upiId,
  quotePrefix: s.quotePrefix,
  validityDays: s.validityDays,
  defaultWarranty: s.defaultWarranty,
  signatoryName: s.signatoryName,
  signatoryTitle: s.signatoryTitle,
  logoUrl: assetUrl(s.logoId),
  signatureUrl: assetUrl(s.signatureId),
});
