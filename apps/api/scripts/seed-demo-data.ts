/**
 * Populates the database with fake invoices spread across a range of issue
 * and due dates, so the Dashboard's overdue/sent counts (and the reminder
 * scheduler) have something real to look at while studying the app.
 *
 * Run with:
 *   npm run seed:demo --workspace=@manejoai/api
 *
 * Creates a handful of accounts prefixed "Demo:" (easy to spot and to remove
 * later - just delete those accounts, everything under them cascades) with
 * invoices covering every status: DRAFT, SENT (not yet due), OVERDUE, PAID,
 * CANCELED. Safe to re-run - it skips creating anything if demo accounts
 * already exist.
 */
import { AccountType, ContactRole, InvoiceStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ITEM_CATALOG = [
  { description: 'Full interior paint - 1BR unit', unitPriceCents: 45000 },
  { description: 'Full interior paint - 2BR unit', unitPriceCents: 65000 },
  { description: 'Ceiling paint', unitPriceCents: 20000 },
  { description: 'Exterior door paint', unitPriceCents: 3000 },
  { description: 'Drywall crack repair', unitPriceCents: 15000 },
  { description: 'Sheetrock repair near AC vents', unitPriceCents: 12000 },
  { description: 'Trim and baseboard touch-up', unitPriceCents: 8000 },
  { description: 'Pressure washing - exterior walkway', unitPriceCents: 25000 },
  { description: 'Color change consultation', unitPriceCents: 5000 },
  { description: 'Materials and supplies', unitPriceCents: 6000 },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  return daysAgo(-n);
}
function items(...indexes: number[]) {
  return indexes.map((i) => ({ ...ITEM_CATALOG[i], quantity: 1 }));
}
function amountOf(rows: { unitPriceCents: number; quantity: number }[]) {
  return rows.reduce((sum, r) => sum + r.unitPriceCents * r.quantity, 0);
}

interface InvoicePlan {
  issueDaysAgo: number;
  dueDaysAgo: number; // negative means due in the future
  status: InvoiceStatus;
  paidDaysAgo?: number;
  canceledDaysAgo?: number;
  itemIndexes: number[];
}

async function main() {
  const existing = await prisma.account.findFirst({ where: { name: { startsWith: 'Demo:' } } });
  if (existing) {
    console.log('Demo data already exists (found "Demo:" accounts) - skipping. Delete them first to reseed.');
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('No admin user found - run `npm run seed` first.');
    process.exit(1);
    return;
  }
  const adminId = admin.id;

  let invoiceCount = await prisma.invoice.count();
  const nextInvoiceNumber = () => `INV-${1001 + invoiceCount++}`;

  async function createInvoice(accountId: string, propertyId: string | null, plan: InvoicePlan) {
    const rows = items(...plan.itemIndexes);
    await prisma.invoice.create({
      data: {
        accountId,
        propertyId: propertyId ?? undefined,
        invoiceNumber: nextInvoiceNumber(),
        amountCents: amountOf(rows),
        issueDate: daysAgo(plan.issueDaysAgo),
        dueDate: daysAgo(plan.dueDaysAgo),
        status: plan.status,
        paidAt: plan.paidDaysAgo !== undefined ? daysAgo(plan.paidDaysAgo) : undefined,
        canceledAt: plan.canceledDaysAgo !== undefined ? daysAgo(plan.canceledDaysAgo) : undefined,
        createdById: adminId,
        items: { create: rows },
      },
    });
  }

  // ---------- Demo: Sunrise Villas Management (MULTIFAMILY) ----------
  const sunrise = await prisma.account.create({
    data: { name: 'Demo: Sunrise Villas Management', type: AccountType.MULTIFAMILY },
  });
  const sunriseProp = await prisma.property.create({
    data: {
      accountId: sunrise.id,
      name: 'Sunrise Villas - Building 2',
      addressLine1: '4420 Sunrise Blvd',
      city: 'Marietta',
      state: 'GA',
      zip: '30060',
    },
  });
  await prisma.contact.create({
    data: {
      accountId: sunrise.id,
      role: ContactRole.INVOICING,
      name: 'Priya Nair',
      email: 'demo-sunrise-ap@manejoai.test',
      receivesInvoices: true,
      receivesReminders: true,
    },
  });

  await createInvoice(sunrise.id, sunriseProp.id, {
    issueDaysAgo: 75, dueDaysAgo: 45, status: InvoiceStatus.SENT, itemIndexes: [0, 4],
  }); // ~45 days overdue
  await createInvoice(sunrise.id, sunriseProp.id, {
    issueDaysAgo: 40, dueDaysAgo: 20, status: InvoiceStatus.SENT, itemIndexes: [1],
  }); // ~20 days overdue
  await createInvoice(sunrise.id, sunriseProp.id, {
    issueDaysAgo: 15, dueDaysAgo: -10, status: InvoiceStatus.SENT, itemIndexes: [2, 9],
  }); // due in 10 days
  await createInvoice(sunrise.id, sunriseProp.id, {
    issueDaysAgo: 5, dueDaysAgo: -25, status: InvoiceStatus.DRAFT, itemIndexes: [5],
  }); // draft, due in 25 days
  await createInvoice(sunrise.id, sunriseProp.id, {
    issueDaysAgo: 95, dueDaysAgo: 65, status: InvoiceStatus.PAID, paidDaysAgo: 58, itemIndexes: [0, 3],
  });

  // ---------- Demo: Marcus Webb (INDIVIDUAL) ----------
  const marcus = await prisma.account.create({
    data: { name: 'Demo: Marcus Webb', type: AccountType.INDIVIDUAL },
  });
  await prisma.contact.create({
    data: {
      accountId: marcus.id,
      role: ContactRole.GENERAL,
      name: 'Marcus Webb',
      email: 'demo-marcus@manejoai.test',
      receivesInvoices: true,
      receivesReminders: true,
    },
  });

  await createInvoice(marcus.id, null, {
    issueDaysAgo: 8, dueDaysAgo: -22, status: InvoiceStatus.SENT, itemIndexes: [6],
  }); // due in 22 days
  await createInvoice(marcus.id, null, {
    issueDaysAgo: 55, dueDaysAgo: 25, status: InvoiceStatus.SENT, itemIndexes: [0],
  }); // ~25 days overdue
  await createInvoice(marcus.id, null, {
    issueDaysAgo: 3, dueDaysAgo: -27, status: InvoiceStatus.DRAFT, itemIndexes: [9],
  });

  // ---------- Demo: Coastal Property Group (MULTIFAMILY, 2 properties) ----------
  const coastal = await prisma.account.create({
    data: { name: 'Demo: Coastal Property Group', type: AccountType.MULTIFAMILY },
  });
  const coastalA = await prisma.property.create({
    data: {
      accountId: coastal.id,
      name: 'Coastal Breeze - Tower A',
      addressLine1: '210 Harbor Dr',
      city: 'Savannah',
      state: 'GA',
      zip: '31401',
    },
  });
  const coastalB = await prisma.property.create({
    data: {
      accountId: coastal.id,
      name: 'Coastal Breeze - Tower B',
      addressLine1: '212 Harbor Dr',
      city: 'Savannah',
      state: 'GA',
      zip: '31401',
    },
  });
  await prisma.contact.create({
    data: {
      accountId: coastal.id,
      propertyId: coastalA.id,
      role: ContactRole.INVOICING,
      name: 'Tower A Office',
      email: 'demo-coastal-a@manejoai.test',
      receivesInvoices: true,
      receivesReminders: true,
    },
  });
  await prisma.contact.create({
    data: {
      accountId: coastal.id,
      propertyId: coastalB.id,
      role: ContactRole.INVOICING,
      name: 'Tower B Office',
      email: 'demo-coastal-b@manejoai.test',
      receivesInvoices: true,
      receivesReminders: true,
    },
  });

  await createInvoice(coastal.id, coastalA.id, {
    issueDaysAgo: 60, dueDaysAgo: 30, status: InvoiceStatus.SENT, itemIndexes: [1, 6],
  }); // ~30 days overdue
  await createInvoice(coastal.id, coastalA.id, {
    issueDaysAgo: 12, dueDaysAgo: -18, status: InvoiceStatus.SENT, itemIndexes: [7],
  }); // due in 18 days
  await createInvoice(coastal.id, coastalB.id, {
    issueDaysAgo: 50, dueDaysAgo: 20, status: InvoiceStatus.SENT, itemIndexes: [0, 8],
  }); // ~20 days overdue
  await createInvoice(coastal.id, coastalB.id, {
    issueDaysAgo: 20, dueDaysAgo: -10, status: InvoiceStatus.SENT, itemIndexes: [2],
  }); // due in 10 days
  await createInvoice(coastal.id, coastalA.id, {
    issueDaysAgo: 7, dueDaysAgo: -23, status: InvoiceStatus.DRAFT, itemIndexes: [4],
  });
  await createInvoice(coastal.id, coastalB.id, {
    issueDaysAgo: 110, dueDaysAgo: 80, status: InvoiceStatus.PAID, paidDaysAgo: 70, itemIndexes: [1],
  });
  await createInvoice(coastal.id, coastalA.id, {
    issueDaysAgo: 100, dueDaysAgo: 70, status: InvoiceStatus.PAID, paidDaysAgo: 65, itemIndexes: [0, 5],
  });
  await createInvoice(coastal.id, coastalB.id, {
    issueDaysAgo: 85, dueDaysAgo: 55, status: InvoiceStatus.CANCELED, canceledDaysAgo: 50, itemIndexes: [3],
  });

  // ---------- Demo: Harbor View HOA (MULTIFAMILY) ----------
  const harbor = await prisma.account.create({
    data: { name: 'Demo: Harbor View HOA', type: AccountType.MULTIFAMILY },
  });
  const harborProp = await prisma.property.create({
    data: {
      accountId: harbor.id,
      name: 'Harbor View - Clubhouse',
      addressLine1: '88 Commodore Way',
      city: 'Brunswick',
      state: 'GA',
      zip: '31520',
    },
  });
  await prisma.contact.create({
    data: {
      accountId: harbor.id,
      role: ContactRole.INVOICING,
      name: 'HOA Board Treasurer',
      email: 'demo-harbor@manejoai.test',
      receivesInvoices: true,
      receivesReminders: true,
    },
  });

  await createInvoice(harbor.id, harborProp.id, {
    issueDaysAgo: 30, dueDaysAgo: -14, status: InvoiceStatus.SENT, itemIndexes: [7],
  }); // due in 14 days
  await createInvoice(harbor.id, harborProp.id, {
    issueDaysAgo: 4, dueDaysAgo: -26, status: InvoiceStatus.DRAFT, itemIndexes: [6, 9],
  });
  await createInvoice(harbor.id, harborProp.id, {
    issueDaysAgo: 65, dueDaysAgo: 35, status: InvoiceStatus.CANCELED, canceledDaysAgo: 30, itemIndexes: [1],
  });

  const total = await prisma.invoice.count();
  const byStatus = await prisma.invoice.groupBy({ by: ['status'], _count: true });
  console.log(`Seeded demo data. Total invoices in DB: ${total}`);
  console.table(byStatus.map((s) => ({ status: s.status, count: s._count })));
  console.log(
    'Note: invoices seeded as SENT with a past due date stay SENT until the reminder scheduler runs ' +
      '(daily at 8am, or POST /api/reminders/run) - that\'s what flips them to OVERDUE, same as real invoices.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
