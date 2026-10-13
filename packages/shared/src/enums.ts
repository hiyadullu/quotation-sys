/** Domain enums. Values mirror the Prisma enums so they can be passed straight through. */

export const ROLES = ['ADMIN', 'SALES'] as const;
export type Role = (typeof ROLES)[number];

export const QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const PRODUCT_CATEGORIES = ['EQUIPMENT', 'PLUMBING', 'CIVIL', 'SERVICES'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const DISCOUNT_TYPES = ['AMOUNT', 'PERCENT'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const TEMPLATE_KINDS = ['SCOPE', 'PAYMENT', 'TERMS'] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export const ACTIVITY_TYPES = [
  'CREATED',
  'UPDATED',
  'PDF_GENERATED',
  'SENT_EMAIL',
  'SENT_WHATSAPP',
  'STATUS_CHANGED',
  'REVISED',
  'DUPLICATED',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin / Owner',
  SALES: 'Sales Executive',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  EQUIPMENT: 'Equipment',
  PLUMBING: 'Plumbing',
  CIVIL: 'Civil Work',
  SERVICES: 'Services',
};

export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = {
  SCOPE: 'Scope of Work',
  PAYMENT: 'Payment Terms',
  TERMS: 'Terms & Conditions',
};

/** Units offered in the item pickers. Free text is still accepted for custom items. */
export const COMMON_UNITS = ['Nos', 'Set', 'Mtr', 'Sq.ft', 'Sq.m', 'Cu.m', 'Kg', 'Ltr', 'Job', 'Lot'] as const;

/** GST slabs used across the app. */
export const GST_SLABS = [0, 5, 12, 18, 28] as const;
