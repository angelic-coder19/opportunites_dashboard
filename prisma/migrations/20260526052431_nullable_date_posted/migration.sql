-- AlterTable
ALTER TABLE "opportunities" ALTER COLUMN "date_posted" DROP NOT NULL,
ALTER COLUMN "date_posted" DROP DEFAULT;

-- Backfill: scraped rows have a misleading "posted today" fallback date.
-- Manual entries keep their real dates from the seed.
UPDATE "opportunities" SET "date_posted" = NULL WHERE "source" != 'manual';
