// Your business info, printed on the invoice PDF header. Edit the fallback
// values directly, or override per-environment by setting VITE_COMPANY_* in
// apps/web/.env (see apps/web/.env.example) without touching code.
export const COMPANY = {
  name: import.meta.env.VITE_COMPANY_NAME || 'SCG SERVICES LLC',
  addressLine1: import.meta.env.VITE_COMPANY_ADDRESS_LINE1 || '131 Hillcrest Dr SW',
  addressLine2: import.meta.env.VITE_COMPANY_ADDRESS_LINE2 || 'Austell, GA 30168-6737',
  phone: import.meta.env.VITE_COMPANY_PHONE || '404-507-4044',
};
