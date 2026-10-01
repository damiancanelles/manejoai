import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CompanyInfo } from './invoicePdf';

interface QuoteItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}
interface QuotePdfData {
  quoteNumber: string;
  amountCents: number;
  issueDate: string;
  notes?: string | null;
  account: { name: string };
  property?: { name: string } | null;
  job?: { title: string } | null;
  items: QuoteItem[];
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const PAGE_WIDTH = 612; // US Letter, points
const MARGIN = 40;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;

/** Mirrors renderInvoicePage's layout (apps/web/src/lib/invoicePdf.ts) - same
 * issuer header and items table, but no due date or payment-methods footer
 * (a quote isn't asking to be paid yet), and a Notes block instead. */
function renderQuotePage(doc: jsPDF, quote: QuotePdfData, company: CompanyInfo) {
  let y = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(company.name, MARGIN, y);
  doc.text(`Quote #${quote.quoteNumber}`, RIGHT_EDGE, y, { align: 'right' });

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

  const col1X = MARGIN;
  const col2X = MARGIN + 150;
  const col3X = MARGIN + 330;
  const labelY = y;
  const valueY = y + 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Created', col1X, labelY);
  doc.text('Customer', col2X, labelY);
  if (quote.job) doc.text('Job', col3X, labelY);

  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(quote.issueDate), col1X, valueY);

  const customerLines = [quote.property ? `${quote.account.name} — ${quote.property.name}` : quote.account.name];
  customerLines.forEach((line, i) => {
    doc.text(line, col2X, valueY + i * 12, { maxWidth: 170 });
  });

  if (quote.job) doc.text(quote.job.title, col3X, valueY, { maxWidth: 150 });

  y = valueY + (customerLines.length - 1) * 12 + 26;

  const rows =
    quote.items.length > 0
      ? quote.items.map((item) => [
          item.description,
          item.quantity.toFixed(5),
          money(item.unitPriceCents),
          money(item.quantity * item.unitPriceCents),
        ])
      : [['Quote total', '1.00000', money(quote.amountCents), money(quote.amountCents)]];

  autoTable(doc, {
    startY: y,
    head: [['Items', 'Quantity', 'Price', 'Amount']],
    body: rows,
    theme: 'plain',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: { top: 6, bottom: 6, left: 0, right: 8 } },
    headStyles: { fontStyle: 'bold', textColor: 30 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 70, halign: 'right' },
      2: { cellWidth: 70, halign: 'right' },
      3: { cellWidth: 70, halign: 'right' },
    },
    didDrawCell: (data) => {
      doc.setDrawColor(230);
      doc.line(MARGIN, data.cell.y + data.cell.height, RIGHT_EDGE, data.cell.y + data.cell.height);
    },
  });

  const subtotalCents = quote.amountCents;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY + 14;

  const labelX = RIGHT_EDGE - 140;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Subtotal', labelX, finalY);
  doc.text(money(subtotalCents), RIGHT_EDGE, finalY, { align: 'right' });
  finalY += 16;
  doc.text('Tax (0%)', labelX, finalY);
  doc.text('$0.00', RIGHT_EDGE, finalY, { align: 'right' });
  finalY += 6;
  doc.setDrawColor(220);
  doc.line(labelX, finalY, RIGHT_EDGE, finalY);
  finalY += 14;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', labelX, finalY);
  doc.text(money(subtotalCents), RIGHT_EDGE, finalY, { align: 'right' });

  if (quote.notes) {
    finalY += 34;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes', MARGIN, finalY);
    finalY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80);
    const lines = doc.splitTextToSize(quote.notes, RIGHT_EDGE - MARGIN) as string[];
    lines.forEach((line, i) => doc.text(line, MARGIN, finalY + i * 12));
    doc.setTextColor(0, 0, 0);
  }
}

/** Same naming convention as downloadFilename in invoicePdf.ts. */
function downloadFilename(quote: QuotePdfData): string {
  const label = quote.property ? `${quote.account.name} - ${quote.property.name}` : quote.account.name;
  const safeLabel = label.replace(/[\\/:*?"<>|]/g, '');
  return `${safeLabel} - Quote ${quote.quoteNumber}.pdf`;
}

export function downloadQuotePdf(quote: QuotePdfData, company: CompanyInfo) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  renderQuotePage(doc, quote, company);
  doc.save(downloadFilename(quote));
}
