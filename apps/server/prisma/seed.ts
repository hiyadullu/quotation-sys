/**
 * Seeds a fresh database with: the admin login, company settings, default templates and a starter
 * product master. With SEED_DEMO_DATA=true (default) it also adds a sales user, sample customers
 * and three sample quotations. Safe to run more than once — it never overwrites existing data.
 */
import bcrypt from 'bcryptjs';
import type { ProductCategory } from '@prisma/client';
import type { QuoteUpdateInput } from '@pool-quote/shared';
import { toDateString } from '../src/lib/dates';
import { prisma } from '../src/lib/prisma';
import type { AuthUser } from '../src/middleware/authenticate';
import { createDraft, setStatus, updateDraft } from '../src/modules/quotes/quotes.service';

const ADMIN = {
  name: process.env.SEED_ADMIN_NAME || 'Owner',
  email: (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase(),
  password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123',
};
const WITH_DEMO = (process.env.SEED_DEMO_DATA ?? 'true') !== 'false';

const hash = (password: string) => bcrypt.hash(password, 12);

async function seedUsers() {
  const admin = await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: {},
    create: { name: ADMIN.name, email: ADMIN.email, passwordHash: await hash(ADMIN.password), role: 'ADMIN' },
  });
  let sales = null;
  if (WITH_DEMO) {
    sales = await prisma.user.upsert({
      where: { email: 'sales@example.com' },
      update: {},
      create: { name: 'Amit Verma', email: 'sales@example.com', mobile: '+919000000001', passwordHash: await hash('Sales@12345'), role: 'SALES' },
    });
  }
  return { admin, sales };
}

async function seedSettings() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: 'ABC Pools',
      tagline: 'Swimming pool construction, equipment & maintenance',
      address: '12, Lake View Road, Arera Colony',
      city: 'Bhopal',
      state: 'Madhya Pradesh',
      pincode: '462016',
      mobile: '+919000000000',
      email: 'info@abcpools.example',
      website: 'www.abcpools.example',
      defaultGstPercent: 18,
      accountName: 'ABC Pools',
      bankName: 'Sample Bank',
      bankBranch: 'Arera Colony',
      accountNumber: '000000000000',
      ifsc: 'SAMP0000000',
      upiId: 'abcpools@sample',
      quotePrefix: 'QT',
      validityDays: 15,
      defaultWarranty: 'Equipment carries the manufacturer\'s warranty. Workmanship is warranted for 12 months from the date of handover.',
      signatoryName: ADMIN.name,
      signatoryTitle: 'Authorized Signatory',
    },
  });
}

async function seedTemplates() {
  if ((await prisma.template.count()) > 0) return;
  await prisma.template.createMany({
    data: [
      {
        kind: 'SCOPE',
        name: 'Equipment supply & installation',
        isDefault: true,
        body: 'Supply, installation, testing and commissioning of the swimming pool filtration, circulation and lighting equipment listed in this quotation, including all interconnecting plumbing and electrical connections up to the control panel.',
      },
      {
        kind: 'SCOPE',
        name: 'Complete pool construction',
        body: 'Excavation, RCC structure, waterproofing, tile finishing, plumbing, filtration and lighting for the swimming pool as per the agreed drawings, including testing, commissioning and handover.',
      },
      { kind: 'PAYMENT', name: 'Standard — 30 / 40 / 20 / 10', isDefault: true, milestones: [
        { label: 'Advance with order', percent: 30 },
        { label: 'On material delivery at site', percent: 40 },
        { label: 'On completion of installation', percent: 20 },
        { label: 'After testing & handover', percent: 10 },
      ] },
      { kind: 'PAYMENT', name: '50% advance, 50% on completion', milestones: [
        { label: 'Advance with order', percent: 50 },
        { label: 'On completion & handover', percent: 50 },
      ] },
      {
        kind: 'TERMS',
        name: 'Standard terms',
        isDefault: true,
        body: [
          'This quotation is valid for the period mentioned above; prices may change after that date.',
          'Prices include supply and installation as described in the scope of work. Items not listed are excluded.',
          'Power supply, water connection and a clear working area at site are to be provided by the customer.',
          'Civil, electrical or any additional work requested beyond the agreed scope will be charged separately.',
          'Delivery and completion timelines are indicative and depend on site readiness and timely payments.',
          'Warranty does not cover damage from misuse, power-supply fluctuation, improper chemical dosing or force majeure.',
          'Goods remain the property of the company until full payment is received.',
          'Disputes are subject to the jurisdiction of the courts at the company\'s registered city.',
        ].join('\n'),
      },
    ],
  });
}

type Seed = { name: string; category: ProductCategory; unit: string; price: number; description?: string; brand?: string; model?: string };

const PRODUCTS: Seed[] = [
  { name: 'Swimming Pool Pump 2 HP', category: 'EQUIPMENT', unit: 'Nos', price: 35000, description: 'Self-priming centrifugal pump with strainer basket.' },
  { name: 'Sand Filter', category: 'EQUIPMENT', unit: 'Nos', price: 42000, description: 'Fibreglass sand filter with multiport valve.' },
  { name: 'Heat Pump', category: 'EQUIPMENT', unit: 'Nos', price: 185000, description: 'Air-source pool heat pump with digital controller.' },
  { name: 'Underwater LED Light', category: 'EQUIPMENT', unit: 'Nos', price: 6500, description: 'RGB LED wall-mounted underwater luminaire.' },
  { name: 'Control Panel', category: 'EQUIPMENT', unit: 'Nos', price: 28000, description: 'Automatic control panel for pump, lights and dosing.' },
  { name: 'UPVC Pipe', category: 'PLUMBING', unit: 'Mtr', price: 320, description: 'UPVC pressure pipe, pool grade.' },
  { name: 'Valve', category: 'PLUMBING', unit: 'Nos', price: 3200, description: 'UPVC ball valve.' },
  { name: 'Main Drain', category: 'PLUMBING', unit: 'Nos', price: 4800, description: 'Anti-vortex main drain with cover.' },
  { name: 'Skimmer', category: 'PLUMBING', unit: 'Nos', price: 7500, description: 'Wide-mouth surface skimmer with basket.' },
  { name: 'Pool Plumbing', category: 'PLUMBING', unit: 'Job', price: 75000, description: 'Complete circulation plumbing for a standard pool.' },
  { name: 'RCC Work', category: 'CIVIL', unit: 'Cu.m', price: 9500, description: 'Reinforced concrete structure including shuttering and steel.' },
  { name: 'Waterproofing', category: 'CIVIL', unit: 'Sq.ft', price: 85, description: 'Polymer-modified waterproofing coat.' },
  { name: 'Tile Work', category: 'CIVIL', unit: 'Sq.ft', price: 220, description: 'Pool-grade tile supply and fixing.' },
  { name: 'Installation', category: 'SERVICES', unit: 'Job', price: 40000, description: 'Installation and fitting of equipment at site.' },
  { name: 'Commissioning & Handover', category: 'SERVICES', unit: 'Job', price: 15000, description: 'Testing, commissioning and handover with operator briefing.' },
];

async function seedProducts() {
  if ((await prisma.product.count()) > 0) return;
  await prisma.product.createMany({ data: PRODUCTS.map((p) => ({ ...p, gstPercent: 18 })) });
}

/* ───────────── demo data ───────────── */

async function seedDemoQuotes(admin: AuthUser, sales: AuthUser) {
  if ((await prisma.customer.count()) > 0) return;

  const byName = new Map((await prisma.product.findMany()).map((p) => [p.name, p]));
  const line = (name: string, quantity = 1, rate?: number) => {
    const p = byName.get(name);
    if (!p) throw new Error(`Seed product missing: ${name}`);
    return {
      productId: p.id,
      name: p.name,
      description: p.description ?? '',
      unit: p.unit,
      quantity,
      rate: rate ?? Number(p.price),
      gstPercent: Number(p.gstPercent),
    };
  };

  const customers = await Promise.all([
    prisma.customer.create({ data: { name: 'Rajesh Sharma', mobile: '+919811111111', email: 'rajesh.sharma@example.com', address: '45, Shyamla Hills', siteAddress: 'Farmhouse 7, Kolar Road', city: 'Bhopal', createdById: sales.id } }),
    prisma.customer.create({ data: { name: 'Anil Gupta', mobile: '+919822222222', email: 'anil.gupta@example.com', address: '8, Vijay Nagar', siteAddress: '8, Vijay Nagar', city: 'Indore', gstin: '23ABCDE1234F1Z5', createdById: sales.id } }),
    prisma.customer.create({ data: { name: 'Harpreet Singh', mobile: '+919833333333', email: 'harpreet.singh@example.com', address: 'Green Valley Resort, Pachmarhi Road', siteAddress: 'Green Valley Resort, Pachmarhi Road', city: 'Hoshangabad', createdById: admin.id } }),
  ]);
  const [sharma, gupta, singh] = customers as [typeof customers[0], typeof customers[0], typeof customers[0]];

  const build = async (user: AuthUser, customerId: string, items: ReturnType<typeof line>[], discountValue: number, extras: Partial<QuoteUpdateInput> = {}) => {
    const draft = await createDraft(user, customerId);
    return updateDraft(draft.id, user, {
      customerId,
      issueDate: draft.issueDate,
      validUntil: draft.validUntil,
      siteAddress: draft.siteAddress ?? '',
      items,
      discountType: 'AMOUNT',
      discountValue,
      otherCharges: 0,
      otherChargesGstPercent: 18,
      scope: draft.scope ?? '',
      paymentTerms: draft.paymentTerms,
      terms: draft.terms ?? '',
      warranty: draft.warranty ?? '',
      ...extras,
    });
  };

  // Mirrors the worked example in the scope document: ₹2,31,000 − ₹10,000 + 18% GST = ₹2,60,780.
  const q1 = await build(sales, sharma.id, [line('Swimming Pool Pump 2 HP'), line('Sand Filter'), line('Underwater LED Light', 6), line('Pool Plumbing'), line('Installation')], 10000);
  await setStatus(q1.id, sales, 'SENT');

  await build(sales, gupta.id, [line('Heat Pump'), line('Control Panel'), line('Installation', 1, 25000)], 0, { otherCharges: 6000 });

  const q3 = await build(admin, singh.id, [line('RCC Work', 28), line('Waterproofing', 640), line('Tile Work', 640), line('Skimmer', 4), line('Main Drain', 2), line('Commissioning & Handover')], 15000);
  await setStatus(q3.id, admin, 'SENT');
  await setStatus(q3.id, admin, 'ACCEPTED');
}

async function main() {
  const { admin, sales } = await seedUsers();
  await seedSettings();
  await seedTemplates();
  await seedProducts();

  if (WITH_DEMO && sales) {
    const asAuth = (u: { id: string; name: string; email: string; role: 'ADMIN' | 'SALES' }): AuthUser => ({ id: u.id, name: u.name, email: u.email, role: u.role });
    await seedDemoQuotes(asAuth(admin), asAuth(sales));
  }

  // eslint-disable-next-line no-console
  console.log(`\nSeed complete (${toDateString(new Date())}).\n  Admin login : ${ADMIN.email}  /  ${ADMIN.password}${WITH_DEMO ? '\n  Sales login : sales@example.com  /  Sales@12345' : ''}\n  Change these passwords after first sign-in (Settings → Account).\n`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
