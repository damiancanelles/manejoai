import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COMPANY } from '../config/company';

// Mirrors apps/web/src/lib/invoicePdf.ts (same visual layout) - kept as a
// separate implementation because it runs in Node (email attachments) rather
// than the browser (the Download PDF button), and jsPDF's output step
// differs between the two (Buffer here vs. triggering a browser download).

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}
interface InvoicePdfData {
  invoiceNumber: string;
  amountCents: number;
  issueDate: Date;
  dueDate: Date;
  notes?: string | null;
  account: { name: string };
  property?: {
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    zip: string;
  } | null;
  job?: { title: string } | null;
  items: InvoiceItem[];
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 40;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;

/** "Payment methods accepted" footer, matching the paper invoices' wording. */
function renderPaymentFooter(doc: jsPDF, startY: number) {
  let y = startY;
  if (y + 140 > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    y = 50;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Payment methods accepted', MARGIN, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('The payment method you use matters when reporting fraud or resolving issues with a purchase.', MARGIN, y);
  y += 14;

  const boxTop = y;
  const boxHeight = 78;
  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN, boxTop, RIGHT_EDGE - MARGIN, boxHeight, 'F');

  const centerX = (MARGIN + RIGHT_EDGE) / 2;
  let boxY = boxTop + 22;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Mail a check to', centerX, boxY, { align: 'center' });
  boxY += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY.name, centerX, boxY, { align: 'center' });
  boxY += 12;
  doc.text(COMPANY.addressLine1, centerX, boxY, { align: 'center' });
  boxY += 12;
  doc.text(COMPANY.addressLine2, centerX, boxY, { align: 'center' });

  y = boxTop + boxHeight + 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  const disclaimer =
    "You can try to stop payment on a check if there's a problem with your payment. Once a check is deposited, it's very unlikely that you'll get your money back.";
  const lines = doc.splitTextToSize(disclaimer, RIGHT_EDGE - MARGIN - 100) as string[];
  lines.forEach((line, i) => doc.text(line, centerX, y + i * 10, { align: 'center' }));
  doc.setTextColor(0, 0, 0);
}

function renderInvoicePage(doc: jsPDF, invoice: InvoicePdfData) {
  let y = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(COMPANY.name, MARGIN, y);
  doc.text(`Invoice #${invoice.invoiceNumber}`, RIGHT_EDGE, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 15;
  doc.text(COMPANY.addressLine1, MARGIN, y);
  y += 12;
  doc.text(COMPANY.addressLine2, MARGIN, y);
  y += 12;
  doc.text(COMPANY.phone, MARGIN, y);

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
  doc.text('Invoice Title', col3X, labelY);

  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.issueDate), col1X, valueY);

  const customerLines: string[] = [];
  if (invoice.property) {
    customerLines.push(invoice.property.name);
    const street = invoice.property.addressLine2
      ? `${invoice.property.addressLine1}, ${invoice.property.addressLine2}`
      : invoice.property.addressLine1;
    customerLines.push(street);
    customerLines.push(`${invoice.property.city}, ${invoice.property.state} ${invoice.property.zip}`);
  } else {
    customerLines.push(invoice.account.name);
  }
  customerLines.forEach((line, i) => {
    doc.text(line, col2X, valueY + i * 12, { maxWidth: 170 });
  });

  const titleLine = invoice.job?.title || invoice.notes || '';
  doc.text(titleLine, col3X, valueY, { maxWidth: 150 });

  y = valueY + (customerLines.length - 1) * 12 + 26;
  doc.setFont('helvetica', 'bold');
  doc.text('Due', col1X, y);
  y += 14;
  doc.setTextColor(37, 99, 235);
  doc.text(formatDate(invoice.dueDate), col1X, y);
  doc.setTextColor(0, 0, 0);

  y += 20;

  const rows =
    invoice.items.length > 0
      ? invoice.items.map((item) => [
          item.description,
          item.quantity.toFixed(5),
          money(item.unitPriceCents),
          money(item.quantity * item.unitPriceCents),
        ])
      : [[invoice.notes || 'Services rendered', '1.00000', money(invoice.amountCents), money(invoice.amountCents)]];

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

  const subtotalCents = invoice.amountCents;
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

  renderPaymentFooter(doc, finalY + 40);
}

/** Renders a single invoice to its own self-contained PDF and returns its bytes. */
export function generateInvoicePdf(invoice: InvoicePdfData): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  renderInvoicePage(doc, invoice);
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
