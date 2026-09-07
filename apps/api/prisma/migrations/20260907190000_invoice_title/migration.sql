-- Rename Invoice.notes -> Invoice.title (same data, clearer name matching
-- what this field actually is - the customer-facing invoice title, not a
-- freeform note). Every existing row already has a non-null, non-empty
-- value here, so this also tightens it to NOT NULL.
ALTER TABLE "Invoice" RENAME COLUMN "notes" TO "title";
ALTER TABLE "Invoice" ALTER COLUMN "title" SET NOT NULL;
