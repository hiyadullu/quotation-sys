import type { ProductDTO, QuoteDTO, QuoteItemInput, QuoteUpdateInput } from '@pool-quote/shared';

export const quoteToForm = (q: QuoteDTO): QuoteUpdateInput => ({
  customerId: q.customer.id,
  issueDate: q.issueDate,
  validUntil: q.validUntil,
  siteAddress: q.siteAddress ?? '',
  items: q.items.map((i) => ({
    productId: i.productId,
    name: i.name,
    description: i.description ?? '',
    unit: i.unit,
    quantity: i.quantity,
    rate: i.rate,
    gstPercent: i.gstPercent,
  })),
  discountType: q.discountType,
  discountValue: q.discountValue,
  otherCharges: q.otherCharges,
  otherChargesGstPercent: q.otherChargesGstPercent,
  scope: q.scope ?? '',
  paymentTerms: q.paymentTerms,
  terms: q.terms ?? '',
  warranty: q.warranty ?? '',
});

export const itemFromProduct = (p: ProductDTO): QuoteItemInput => ({
  productId: p.id,
  name: p.name,
  description: p.description ?? '',
  unit: p.unit,
  quantity: 1,
  rate: p.price,
  gstPercent: p.gstPercent,
});

export const blankItem = (gstPercent = 18): QuoteItemInput => ({
  productId: null,
  name: '',
  description: '',
  unit: 'Nos',
  quantity: 1,
  rate: 0,
  gstPercent,
});
