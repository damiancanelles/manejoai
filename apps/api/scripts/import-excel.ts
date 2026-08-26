/**
 * One-time import of Damian's existing invoice-tracking Excel file into
 * manejoai. Run with:
 *
 *   npm run import:excel --workspace=@manejoai/api -- "/path/to/invoices.xlsx"
 *
 * Expected columns (header row, case-insensitive - order doesn't matter):
 *   Property / Customer   -> account name (an Account is created if it
 *                            doesn't exist yet, as type INDIVIDUAL by
 *                            default - reclassify as MULTIFAMILY in the UI
 *                            afterward for property-management accounts)
 *   Invoice Number
 *   Amount                 -> plain number, e.g. 450 or 450.00
 *   Date                    -> issue date
 *   Status                  -> Paid / Overdue / Canceled / Awaiting Payment
 *
 * Assumptions worth checking after import:
 *  - There's no "due date" column in the old tracker, so due date is set to
 *    issue date + IMPORT_DEFAULT_TERMS_DAYS (default 14, matches the
 *    reminder grace period). Adjust per-invoice afterward if some jobs used
 *    different terms.
 *  - Unrecognized status values import as OVERDUE (Damian's own description:
 *    "it's overdue since the first moment") rather than blocking the import.
 *  - Duplicate invoice numbers are skipped with a warning instead of
 *    overwriting - the import is safe to re-run after fixing the sheet.
 */
import { PrismaClient, AccountType, InvoiceStatus } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();
const DEFAULT_TERMS_DAYS = Number(process.env.IMPORT_DEFAULT_TERMS_DAYS ?? 14);

function normalizeStatus(raw: string | undefined): InvoiceStatus {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === 'paid') return InvoiceStatus.PAID;
  if (s === 'canceled' || s === 'cancelled') return InvoiceStatus.CANCELED;
  if (s === 'awaiting payment' || s === 'sent') return InvoiceStatus.SENT;
  if (s === 'overdue') return InvoiceStatus.OVERDUE;
  console.warn(`  ! unrecognized status "${raw}" - defaulting to OVERDUE`);
  return InvoiceStatus.OVERDUE;
}

function findColumn(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const key = keys.find((k) => k.trim().toLowerCase() === candidate);
    if (key) return row[key];
  }
  return undefined;
}

function parseAmountCents(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(num)) return null;
  return Math.round(num * 100);
}

function parseDate(raw: unknown): Date | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === 'number') {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const parsed = new Date(String(raw));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: import-excel.ts <path-to-xlsx>');
    process.exit(1);
  }

  const importUser = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!importUser) {
    console.error('No users found - run `npm run seed --workspace=@manejoai/api` first to create an admin user.');
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  console.log(`Found ${rows.length} row(s) in "${workbook.SheetNames[0]}"`);

  let created = 0;
  let skipped = 0;

  for (const [i, row] of rows.entries()) {
    const accountName = String(findColumn(row, ['property', 'property name', 'customer', 'customer name']) ?? '').trim();
    const invoiceNumber = String(findColumn(row, ['invoice number', 'invoice #', 'invoice']) ?? '').trim();
    const amountCents = parseAmountCents(findColumn(row, ['amount']));
    const issueDate = parseDate(findColumn(row, ['date', 'issue date']));
    const status = normalizeStatus(String(findColumn(row, ['status']) ?? ''));

    if (!accountName || !invoiceNumber || amountCents === null || !issueDate) {
      console.warn(`Row ${i + 2}: missing required data (account/invoice number/amount/date) - skipping`);
      skipped++;
      continue;
    }

    const existingInvoice = await prisma.invoice.findUnique({ where: { invoiceNumber } });
    if (existingInvoice) {
      console.warn(`Row ${i + 2}: invoice ${invoiceNumber} already imported - skipping`);
      skipped++;
      continue;
    }

    let account = await prisma.account.findFirst({ where: { name: accountName } });
    if (!account) {
      account = await prisma.account.create({
        data: { name: accountName, type: AccountType.INDIVIDUAL },
      });
    }

    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + DEFAULT_TERMS_DAYS);

    await prisma.invoice.create({
      data: {
        accountId: account.id,
        invoiceNumber,
        amountCents,
        issueDate,
        dueDate,
        status,
        paidAt: status === InvoiceStatus.PAID ? issueDate : undefined,
        canceledAt: status === InvoiceStatus.CANCELED ? issueDate : undefined,
        createdById: importUser.id,
      },
    });
    created++;
  }

  console.log(`\nImport complete: ${created} invoice(s) created, ${skipped} row(s) skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
