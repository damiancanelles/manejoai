// Business info printed on generated invoice PDFs (see invoices/invoice-pdf.ts).
// Mirrors apps/web/src/config/company.ts - kept in sync manually since the
// two apps don't share a runtime. Override via COMPANY_* in apps/api/.env
// (see .env.example) without touching code.
export const COMPANY = {
  name: process.env.COMPANY_NAME || 'SCG SERVICES LLC',
  addressLine1: process.env.COMPANY_ADDRESS_LINE1 || '131 Hillcrest Dr SW',
  addressLine2: process.env.COMPANY_ADDRESS_LINE2 || 'Austell, GA 30168-6737',
  phone: process.env.COMPANY_PHONE || '404-507-4044',
};
