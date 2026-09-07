-- Invoice numbers become unique per business instead of one shared global
-- sequence, so a newly registered business's invoices start at 10001
-- instead of continuing wherever every other tenant's numbering left off.

-- Add Invoice.businessId, backfilled from each invoice's own account -
-- every existing invoice already has an account, so this always resolves.
ALTER TABLE "Invoice" ADD COLUMN "businessId" TEXT;
UPDATE "Invoice" i SET "businessId" = a."businessId" FROM "Account" a WHERE a."id" = i."accountId";
ALTER TABLE "Invoice" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Swap the old global-unique constraint on invoiceNumber alone for a
-- composite one scoped to (businessId, invoiceNumber).
DROP INDEX "Invoice_invoiceNumber_key";
CREATE UNIQUE INDEX "Invoice_businessId_invoiceNumber_key" ON "Invoice"("businessId", "invoiceNumber");
