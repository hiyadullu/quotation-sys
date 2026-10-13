import type {
  ActivityType,
  DiscountType,
  ProductCategory,
  QuoteStatus,
  Role,
  TemplateKind,
} from './enums';
import type { QuoteTotals } from './pricing';
import type { Milestone } from './schemas';

/** Response shapes returned by the API. Dates are ISO strings; money is rupees. */

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerDTO {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  siteAddress: string | null;
  city: string | null;
  gstin: string | null;
  createdAt: string;
  quoteCount?: number;
}

export interface ProductDTO {
  id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  brand: string | null;
  model: string | null;
  unit: string;
  price: number;
  gstPercent: number;
  imageUrl: string | null;
  isActive: boolean;
}

export interface TemplateDTO {
  id: string;
  kind: TemplateKind;
  name: string;
  body: string | null;
  milestones: Milestone[] | null;
  isDefault: boolean;
}

export interface SettingsDTO {
  companyName: string;
  tagline: string | null;
  address: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  mobile: string;
  email: string;
  website: string | null;
  defaultGstPercent: number;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  bankBranch: string | null;
  upiId: string | null;
  quotePrefix: string;
  validityDays: number;
  defaultWarranty: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
}

export interface QuoteItemDTO {
  id: string;
  productId: string | null;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  rate: number;
  gstPercent: number;
  amount: number;
}

export interface QuoteActivityDTO {
  id: string;
  type: ActivityType;
  note: string | null;
  createdAt: string;
  user: { id: string; name: string } | null;
}

export interface QuoteSummaryDTO {
  id: string;
  quoteNumber: string;
  version: number;
  displayNumber: string;
  isLatest: boolean;
  status: QuoteStatus;
  customer: { id: string; name: string; mobile: string; email: string | null };
  createdBy: { id: string; name: string };
  total: number;
  issueDate: string;
  validUntil: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteDTO extends QuoteSummaryDTO {
  siteAddress: string | null;
  discountType: DiscountType;
  discountValue: number;
  otherCharges: number;
  otherChargesGstPercent: number;
  scope: string | null;
  paymentTerms: Milestone[];
  terms: string | null;
  warranty: string | null;
  items: QuoteItemDTO[];
  totals: QuoteTotals;
  /** Other versions of the same quotation, newest first. */
  versions: { id: string; version: number; status: QuoteStatus; createdAt: string }[];
  activities: QuoteActivityDTO[];
  issueProblems: string[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DashboardDTO {
  created: number;
  sent: number;
  accepted: number;
  pending: number;
  recent: QuoteSummaryDTO[];
  customerCount: number;
  productCount: number;
}

export interface ReportDTO {
  from: string | null;
  to: string | null;
  totalQuotes: number;
  totalValue: number;
  sent: number;
  accepted: number;
  rejected: number;
  draft: number;
  acceptedValue: number;
  /** accepted ÷ sent, as a percentage. */
  conversionRate: number;
  byMonth: { month: string; count: number; value: number }[];
}

export interface ShareDefaultsDTO {
  pdfFileName: string;
  whatsapp: { phone: string; message: string };
  email: { to: string; subject: string; body: string; smtpConfigured: boolean };
  publicPdfUrl: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string[]> };
}
