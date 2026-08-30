CREATE TYPE "public"."account_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('bank', 'cash_wallet', 'digital_wallet', 'investment', 'credit_card');--> statement-breakpoint
CREATE TYPE "public"."allocation_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('mutual_fund', 'equity', 'etf', 'other');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('expense', 'income', 'both');--> statement-breakpoint
CREATE TYPE "public"."duplicate_status" AS ENUM('none', 'possible_duplicate', 'confirmed_duplicate');--> statement-breakpoint
CREATE TYPE "public"."held_for_other_status" AS ENUM('open', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."investment_transaction_type" AS ENUM('buy', 'sell', 'contribution', 'withdrawal', 'dividend', 'other');--> statement-breakpoint
CREATE TYPE "public"."leg_direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."liability_status" AS ENUM('open', 'partially_paid', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."liability_type" AS ENUM('person', 'bank', 'credit_card', 'other');--> statement-breakpoint
CREATE TYPE "public"."lien_source" AS ENUM('manual', 'statement_import', 'reconciliation');--> statement-breakpoint
CREATE TYPE "public"."match_type" AS ENUM('exact', 'contains', 'prefix', 'regex');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'invited', 'removed');--> statement-breakpoint
CREATE TYPE "public"."receivable_status" AS ENUM('open', 'partially_received', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recurring_day_rule" AS ENUM('first_day', 'last_working_day', 'custom_day');--> statement-breakpoint
CREATE TYPE "public"."recurring_frequency" AS ENUM('monthly');--> statement-breakpoint
CREATE TYPE "public"."recurring_occurrence_status" AS ENUM('pending', 'confirmed', 'received_early', 'will_receive_later', 'skipped', 'created');--> statement-breakpoint
CREATE TYPE "public"."recurring_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'accepted', 'edited', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."statement_import_status" AS ENUM('uploaded', 'processing', 'review', 'confirmed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_source" AS ENUM('web', 'shortcut', 'import', 'recurring', 'system', 'manual');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('active', 'pending_sync', 'deleted', 'voided');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('expense', 'income', 'transfer', 'investment_contribution', 'investment_withdrawal', 'receivable_create', 'receivable_receive', 'liability_create', 'liability_payment', 'credit_card_purchase', 'credit_card_payment', 'adjustment', 'opening_balance');--> statement-breakpoint
CREATE TABLE "account_state" (
	"financial_account_id" uuid PRIMARY KEY NOT NULL,
	"lien_amount_minor" bigint DEFAULT 0 NOT NULL,
	"reconciled_balance_minor" bigint,
	"last_reconciled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "allocation_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"period_start_date" date NOT NULL,
	"period_end_date" date NOT NULL,
	"notify_threshold_percent" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_budget_amount" CHECK ("budget"."amount_minor" >= 0),
	CONSTRAINT "chk_budget_dates" CHECK ("budget"."period_end_date" >= "budget"."period_start_date"),
	CONSTRAINT "chk_budget_threshold" CHECK ("budget"."notify_threshold_percent" >= 0 AND "budget"."notify_threshold_percent" <= 100)
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"name" text NOT NULL,
	"parent_id" uuid,
	"category_type" "category_type" NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"icon_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "financial_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"account_type" "account_type" NOT NULL,
	"institution_name" text,
	"currency" char(3) NOT NULL,
	"color" text,
	"icon_key" text,
	"opening_balance_minor" bigint NOT NULL,
	"opening_balance_date" date NOT NULL,
	"status" "account_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "held_for_other" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"counterparty_name" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"status" "held_for_other_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"key_hash" text NOT NULL,
	"request_fingerprint" text,
	"response_payload" jsonb,
	"resource_type" text,
	"resource_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "investment_position" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"financial_account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"symbol" text,
	"asset_type" "asset_type" NOT NULL,
	"units" numeric,
	"average_cost_minor" bigint,
	"currency" char(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_price_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"symbol" text,
	"price_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"is_estimated" boolean NOT NULL,
	"source_metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "investment_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"transaction_type" "investment_transaction_type" NOT NULL,
	"units" numeric,
	"price_minor" bigint,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"transaction_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "liability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"counterparty_name" text NOT NULL,
	"liability_type" "liability_type" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"created_date" date NOT NULL,
	"due_date" date,
	"status" "liability_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "liability_payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liability_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"paid_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lien_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"financial_account_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"effective_date" date NOT NULL,
	"source" "lien_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"match_type" "match_type" NOT NULL,
	"pattern" text NOT NULL,
	"merchant_name" text,
	"category_id" uuid NOT NULL,
	"subcategory_id" uuid,
	"priority" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"counterparty_name" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"created_date" date NOT NULL,
	"expected_date" date,
	"status" "receivable_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivable_settlement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receivable_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"settled_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"financial_account_id" uuid NOT NULL,
	"reconciliation_date" date NOT NULL,
	"calculated_balance_minor" bigint NOT NULL,
	"actual_balance_minor" bigint NOT NULL,
	"difference_minor" bigint NOT NULL,
	"adjustment_transaction_id" uuid,
	"note" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"type" "recurring_type" NOT NULL,
	"name" text NOT NULL,
	"expected_amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"category_id" uuid,
	"default_account_id" uuid,
	"frequency" "recurring_frequency" NOT NULL,
	"day_rule" "recurring_day_rule" NOT NULL,
	"custom_day" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_occurrence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recurring_item_id" uuid NOT NULL,
	"expected_date" date NOT NULL,
	"status" "recurring_occurrence_status" NOT NULL,
	"actual_date" date,
	"actual_amount_minor" bigint,
	"transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortcut_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statement_import" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"financial_account_id" uuid NOT NULL,
	"file_object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"status" "statement_import_status" NOT NULL,
	"statement_start_date" date,
	"statement_end_date" date,
	"extracted_closing_balance_minor" bigint,
	"extracted_closing_balance_currency" char(3),
	"lien_amount_minor" bigint,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statement_import_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement_import_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"transaction_date" date NOT NULL,
	"description" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"direction" "leg_direction" NOT NULL,
	"reference_id" text,
	"normalized_merchant" text,
	"suggested_category_id" uuid,
	"confidence" numeric,
	"duplicate_status" "duplicate_status" DEFAULT 'none' NOT NULL,
	"review_status" "review_status" DEFAULT 'pending' NOT NULL,
	"committed_transaction_id" uuid
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"transaction_type" "transaction_type" NOT NULL,
	"status" "transaction_status" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"transaction_date" date NOT NULL,
	"description" text,
	"merchant_name" text,
	"note" text,
	"category_id" uuid,
	"subcategory_id" uuid,
	"source" "transaction_source" NOT NULL,
	"client_transaction_id" uuid,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transaction_allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"percentage" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_leg" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"account_id" uuid,
	"direction" "leg_direction" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"leg_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_tag" (
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "transaction_tag_transaction_id_tag_id_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"base_currency" char(3) NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workspace_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "role" NOT NULL,
	"status" "member_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp,
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"phone_number" text,
	"phone_number_verified" boolean,
	"two_factor_enabled" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_state" ADD CONSTRAINT "account_state_financial_account_id_financial_account_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."financial_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation" ADD CONSTRAINT "allocation_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "held_for_other" ADD CONSTRAINT "held_for_other_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "held_for_other" ADD CONSTRAINT "held_for_other_account_id_financial_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_key" ADD CONSTRAINT "idempotency_key_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_position" ADD CONSTRAINT "investment_position_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_position" ADD CONSTRAINT "investment_position_financial_account_id_financial_account_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."financial_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_price_snapshot" ADD CONSTRAINT "investment_price_snapshot_position_id_investment_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."investment_position"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_transaction" ADD CONSTRAINT "investment_transaction_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_transaction" ADD CONSTRAINT "investment_transaction_position_id_investment_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."investment_position"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_transaction" ADD CONSTRAINT "investment_transaction_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liability" ADD CONSTRAINT "liability_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liability_payment" ADD CONSTRAINT "liability_payment_liability_id_liability_id_fk" FOREIGN KEY ("liability_id") REFERENCES "public"."liability"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liability_payment" ADD CONSTRAINT "liability_payment_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lien_snapshot" ADD CONSTRAINT "lien_snapshot_financial_account_id_financial_account_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."financial_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rule" ADD CONSTRAINT "merchant_rule_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable" ADD CONSTRAINT "receivable_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_settlement" ADD CONSTRAINT "receivable_settlement_receivable_id_receivable_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "public"."receivable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_settlement" ADD CONSTRAINT "receivable_settlement_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation" ADD CONSTRAINT "reconciliation_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation" ADD CONSTRAINT "reconciliation_financial_account_id_financial_account_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."financial_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation" ADD CONSTRAINT "reconciliation_adjustment_transaction_id_transaction_id_fk" FOREIGN KEY ("adjustment_transaction_id") REFERENCES "public"."transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation" ADD CONSTRAINT "reconciliation_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_item" ADD CONSTRAINT "recurring_item_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrence" ADD CONSTRAINT "recurring_occurrence_recurring_item_id_recurring_item_id_fk" FOREIGN KEY ("recurring_item_id") REFERENCES "public"."recurring_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrence" ADD CONSTRAINT "recurring_occurrence_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortcut_token" ADD CONSTRAINT "shortcut_token_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shortcut_token" ADD CONSTRAINT "shortcut_token_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_import" ADD CONSTRAINT "statement_import_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_import" ADD CONSTRAINT "statement_import_financial_account_id_financial_account_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."financial_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_import" ADD CONSTRAINT "statement_import_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_import_row" ADD CONSTRAINT "statement_import_row_statement_import_id_statement_import_id_fk" FOREIGN KEY ("statement_import_id") REFERENCES "public"."statement_import"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_import_row" ADD CONSTRAINT "statement_import_row_committed_transaction_id_transaction_id_fk" FOREIGN KEY ("committed_transaction_id") REFERENCES "public"."transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_allocation" ADD CONSTRAINT "transaction_allocation_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_allocation" ADD CONSTRAINT "transaction_allocation_allocation_id_allocation_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_leg" ADD CONSTRAINT "transaction_leg_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_leg" ADD CONSTRAINT "transaction_leg_account_id_financial_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_event_workspace_entity_idx" ON "audit_event" USING btree ("workspace_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_event_workspace_date_idx" ON "audit_event" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_workspace_category_period_idx" ON "budget" USING btree ("workspace_id","category_id","period_start_date");--> statement-breakpoint
CREATE INDEX "budget_workspace_period_idx" ON "budget" USING btree ("workspace_id","period_start_date");--> statement-breakpoint
CREATE INDEX "category_workspace_idx" ON "category" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_workspace_scope_hash_idx" ON "idempotency_key" USING btree ("workspace_id","scope","key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_occurrence_item_date_idx" ON "recurring_occurrence" USING btree ("recurring_item_id","expected_date");--> statement-breakpoint
CREATE INDEX "shortcut_token_hash_idx" ON "shortcut_token" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "tag_workspace_idx" ON "tag" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_workspace_client_tx_idx" ON "transaction" USING btree ("workspace_id","client_transaction_id") WHERE "transaction"."client_transaction_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "transaction_workspace_date_idx" ON "transaction" USING btree ("workspace_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transaction_leg_tx_idx" ON "transaction_leg" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_leg_account_idx" ON "transaction_leg" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_member_workspace_user_idx" ON "workspace_member" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");