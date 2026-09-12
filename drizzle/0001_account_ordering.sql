ALTER TABLE "financial_account" ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0 NOT NULL;
ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "account_type_order" jsonb;
