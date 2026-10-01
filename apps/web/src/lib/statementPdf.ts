import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../api/client';
import type { CompanyInfo } from './invoicePdf';

interface StatementInvoiceRow {
  invoiceNumber: string;
  title: string;
  issueDate: string;
  dueDate: string;
  status: string;
  amountCents: number;
  propertyName: string | null;
}
interface StatementPaymentRow {
  paidAt: string;
  appliedCents: number;
  invoiceNumbers: string[];
}
interface StatementData {
  scope: 'account' | 'property';
  accountName: string;
  propertyName: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  invoices: StatementInvoiceRow[];
  payments: StatementPaymentRow[];
  totals: { invoicedCents: number; paidCents: number; balanceCents: number };
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 40;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;

function renderStatement(doc: jsPDF, statement: StatementData, company: CompanyInfo) {
  let y = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(company.name, MARGIN, y);
  doc.text('Statement of Account', RIGHT_EDGE, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 15;
  doc.text(company.addressLine1, MARGIN, y);
  if (company.addressLine2) {
    y += 12;
    doc.text(company.addressLine2, MARGIN, y);
  }
  if (company.phone) {
    y += 12;
    doc.text(company.phone, MARGIN, y);
  }

  y += 18;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, RIGHT_EDGE, y);
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Customer', MARGIN, y);
  if (statement.propertyName) doc.text('Property', MARGIN + 220, y);
  doc.text('Period', RIGHT_EDGE - 150, y);

  doc.setFont('helvetica', 'normal');
  const valueY = y + 14;
  doc.text(statement.accountName, MARGIN, valueY, { maxWidth: 200 });
  if (statement.propertyName) doc.text(statement.propertyName, MARGIN + 220, valueY, { maxWidth: 150 });
  const period = statement.periodFrom || statement.periodTo
    ? `${statement.periodFrom ? formatDate(statement.periodFrom) : 'the beginning'} – ${statement.periodTo ? formatDate(statement.periodTo) : 'today'}`
    : 'All time';
  doc.text(period, RIGHT_EDGE - 150, valueY, { maxWidth: 150 });

  y = valueY + 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Invoices', MARGIN, y);
  y += 8;

  const invoiceRows =
    statement.invoices.length > 0
      ? statement.invoices.map((i) => [
          i.invoiceNumber,
          formatDate(i.issueDate),
          i.propertyName ?? '',
          i.status,
          money(i.amountCents),
        ])
      : [];

  autoTable(doc, {
    startY: y,
    head: [['Invoice #', 'Issued', 'Property', 'Status', 'Amount']],
    body: invoiceRows,
    theme: 'plain',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 0, right: 8 } },
    headStyles: { fontStyle: 'bold', textColor: 30 },
    columnStyles: {
      4: { halign: 'right' },
    },
    didDrawCell: (data) => {
      doc.setDrawColor(230);
      doc.line(MARGIN, data.cell.y + data.cell.height, RIGHT_EDGE, data.cell.y + data.cell.height);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  if (invoiceRows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('No invoices in this period.', MARGIN, finalY);
    doc.setTextColor(0, 0, 0);
    finalY += 16;
  }

  if (finalY + 120 > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    finalY = 50;
  }

  finalY += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Payments', MARGIN, finalY);
  finalY += 8;

  const paymentRows =
    statement.payments.length > 0
      ? statement.payments.map((p) => [formatDate(p.paidAt), p.invoiceNumbers.join(', '), money(p.appliedCents)])
      : [];

  autoTable(doc, {
    startY: finalY,
    head: [['Received', 'Applied to', 'Amount']],
    body: paymentRows,
    theme: 'plain',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 0, right: 8 } },
    headStyles: { fontStyle: 'bold', textColor: 30 },
    columnStyles: {
      2: { halign: 'right' },
    },
    didDrawCell: (data) => {
      doc.setDrawColor(230);
      doc.line(MARGIN, data.cell.y + data.cell.height, RIGHT_EDGE, data.cell.y + data.cell.height);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  finalY = (doc as any).lastAutoTable.finalY + 14;
  if (paymentRows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('No payments in this period.', MARGIN, finalY);
    doc.setTextColor(0, 0, 0);
    finalY += 16;
  }

  if (finalY + 70 > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    finalY = 50;
  }

  const labelX = RIGHT_EDGE - 160;
  finalY += 10;
  doc.setDrawColor(220);
  doc.line(labelX, finalY, RIGHT_EDGE, finalY);
  finalY += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Total invoiced', labelX, finalY);
  doc.text(money(statement.totals.invoicedCents), RIGHT_EDGE, finalY, { align: 'right' });
  finalY += 16;
  doc.text('Total paid', labelX, finalY);
  doc.text(money(statement.totals.paidCents), RIGHT_EDGE, finalY, { align: 'right' });
  finalY += 6;
  doc.line(labelX, finalY, RIGHT_EDGE, finalY);
  finalY += 14;
  doc.setFont('helvetica', 'bold');
  doc.text('Balance due', labelX, finalY);
  doc.text(money(statement.totals.balanceCents), RIGHT_EDGE, finalY, { align: 'right' });
}

function downloadFilename(statement: StatementData): string {
  const label = statement.propertyName ? `${statement.accountName} - ${statement.propertyName}` : statement.accountName;
  const safeLabel = label.replace(/[\\/:*?"<>|]/g, '');
  return `${safeLabel} - Statement.pdf`;
}

/**
 * Fetches the statement data and generates+downloads its PDF in one call -
 * used both by a manual "statement" UI (if one is ever added) and by the
 * assistant chat's statement links (see AssistantWidget's ChatText), which
 * intercept a `/statements/account/<id>` or `/statements/property/<id>`
 * path instead of navigating to it.
 */
export async function downloadStatementPdf(
  scope: 'account' | 'property',
  id: string,
  company: CompanyInfo,
  dateFrom?: string,
  dateTo?: string,
) {
  const qs = new URLSearchParams();
  if (dateFrom) qs.set('dateFrom', dateFrom);
  if (dateTo) qs.set('dateTo', dateTo);
  const path = scope === 'account' ? `/accounts/${id}/statement` : `/properties/${id}/statement`;
  const statement = await api.get<StatementData>(qs.toString() ? `${path}?${qs.toString()}` : path);

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  renderStatement(doc, statement, company);
  doc.save(downloadFilename(statement));
}
