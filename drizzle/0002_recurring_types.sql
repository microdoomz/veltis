ALTER TYPE "recurring_type" ADD VALUE IF NOT EXISTS 'transfer';
ALTER TYPE "recurring_type" ADD VALUE IF NOT EXISTS 'investment';
ALTER TABLE "recurring_item" ADD COLUMN IF NOT EXISTS "destination_account_id" uuid;
