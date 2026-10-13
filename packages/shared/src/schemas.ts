import { z } from 'zod';
import {
  DISCOUNT_TYPES,
  PRODUCT_CATEGORIES,
  QUOTE_STATUSES,
  ROLES,
  TEMPLATE_KINDS,
} from './enums';
import { normalizeMobile } from './mobile';

/* ---------- primitives ---------- */

/** Optional free text; an empty string is accepted (HTML inputs always send one). */
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const mobileSchema = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .refine((v) => normalizeMobile(v) !== null, 'Enter a valid mobile number');

const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === '' || GSTIN_REGEX.test(v), 'Enter a valid 15-character GSTIN')
  .optional();

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');
const optionalEmail = z.union([emailSchema, z.literal('')]).optional();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const money = z.number({ invalid_type_error: 'Enter a number' }).min(0, 'Cannot be negative').max(999_999_999);
const percent = z.number({ invalid_type_error: 'Enter a number' }).min(0).max(100);

/* ---------- auth ---------- */

export const loginSchema = z.object({
  identifier: requiredText('Email or mobile number', 120),
  password: z.string().min(1, 'Password is required').max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Use at least 8 characters').max(200),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'New password must be different',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/* ---------- users (admin) ---------- */

export const userCreateSchema = z.object({
  name: requiredText('Name', 100),
  email: emailSchema,
  mobile: z.union([mobileSchema, z.literal('')]).optional(),
  role: z.enum(ROLES),
  password: z.string().min(8, 'Use at least 8 characters').max(200),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: requiredText('Name', 100),
  email: emailSchema,
  mobile: z.union([mobileSchema, z.literal('')]).optional(),
  role: z.enum(ROLES),
  isActive: z.boolean(),
  /** Leave empty to keep the current password. */
  password: z.union([z.string().min(8, 'Use at least 8 characters').max(200), z.literal('')]).optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

/* ---------- customers ---------- */

export const customerSchema = z.object({
  name: requiredText('Customer name', 120),
  mobile: mobileSchema,
  email: optionalEmail,
  address: optionalText(400),
  siteAddress: optionalText(400),
  city: optionalText(80),
  gstin: gstinSchema,
});
export type CustomerInput = z.infer<typeof customerSchema>;

/* ---------- products ---------- */

export const productSchema = z.object({
  name: requiredText('Item name', 160),
  description: optionalText(600),
  category: z.enum(PRODUCT_CATEGORIES),
  brand: optionalText(80),
  model: optionalText(80),
  unit: requiredText('Unit', 20),
  price: money,
  gstPercent: percent,
  isActive: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productSchema>;

/* ---------- templates ---------- */

export const milestoneSchema = z.object({
  label: requiredText('Milestone', 120),
  percent: z.number({ invalid_type_error: 'Enter a number' }).min(0).max(100),
});
export type Milestone = z.infer<typeof milestoneSchema>;

export const templateSchema = z
  .object({
    kind: z.enum(TEMPLATE_KINDS),
    name: requiredText('Template name', 80),
    body: z.string().max(8000).optional().or(z.literal('')),
    milestones: z.array(milestoneSchema).max(12).optional(),
    isDefault: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'PAYMENT') {
      const total = (v.milestones ?? []).reduce((s, m) => s + m.percent, 0);
      if (!v.milestones?.length) ctx.addIssue({ code: 'custom', path: ['milestones'], message: 'Add at least one milestone' });
      else if (Math.abs(total - 100) > 0.01) ctx.addIssue({ code: 'custom', path: ['milestones'], message: `Milestones total ${total}% — they must add up to 100%` });
    } else if (!v.body?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['body'], message: 'Content is required' });
    }
  });
export type TemplateInput = z.infer<typeof templateSchema>;

/* ---------- company & quotation settings ---------- */

export const settingsSchema = z.object({
  companyName: requiredText('Company name', 120),
  tagline: optionalText(160),
  address: requiredText('Address', 400),
  city: optionalText(80),
  state: optionalText(80),
  pincode: optionalText(10),
  gstin: gstinSchema,
  mobile: mobileSchema,
  email: emailSchema,
  website: optionalText(120),

  defaultGstPercent: percent,
  bankName: optionalText(120),
  accountName: optionalText(120),
  accountNumber: optionalText(40),
  ifsc: optionalText(20),
  bankBranch: optionalText(120),
  upiId: optionalText(80),

  quotePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,8}$/, 'Use 2–8 letters or digits'),
  validityDays: z.number().int().min(1).max(365),
  defaultWarranty: optionalText(1000),
  signatoryName: optionalText(100),
  signatoryTitle: optionalText(100),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

/* ---------- quotes ---------- */

export const quoteItemSchema = z.object({
  productId: z.string().nullable().optional(),
  name: requiredText('Item name', 160),
  description: optionalText(600),
  unit: requiredText('Unit', 20),
  quantity: z.number({ invalid_type_error: 'Enter a number' }).positive('Must be more than 0').max(1_000_000),
  rate: money,
  gstPercent: percent,
});
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;

export const quoteCreateSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
});
export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

export const quoteUpdateSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  issueDate: isoDate,
  validUntil: isoDate,
  siteAddress: optionalText(400),
  items: z.array(quoteItemSchema).max(100),
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: money,
  otherCharges: money,
  otherChargesGstPercent: percent,
  scope: optionalText(8000),
  paymentTerms: z.array(milestoneSchema).max(12),
  terms: optionalText(8000),
  warranty: optionalText(1000),
});
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;

export const quoteStatusSchema = z.object({
  status: z.enum(QUOTE_STATUSES.filter((s) => s !== 'DRAFT') as ['SENT', 'ACCEPTED', 'REJECTED']),
});
export type QuoteStatusInput = z.infer<typeof quoteStatusSchema>;

export const quoteListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(QUOTE_STATUSES).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type QuoteListQuery = z.infer<typeof quoteListQuerySchema>;

/* ---------- sharing ---------- */

export const emailShareSchema = z.object({
  to: emailSchema,
  subject: requiredText('Subject', 200),
  body: requiredText('Message', 5000),
});
export type EmailShareInput = z.infer<typeof emailShareSchema>;
