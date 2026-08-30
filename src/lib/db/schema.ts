import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  char,
  pgEnum,
  bigint,
  jsonb,
  date,
  numeric,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema';

export * from './auth-schema';

// Enums
export const roleEnum = pgEnum('role', ['owner', 'member']);
export const memberStatusEnum = pgEnum('member_status', ['active', 'invited', 'removed']);
export const accountTypeEnum = pgEnum('account_type', ['bank', 'cash_wallet', 'digital_wallet', 'investment', 'credit_card']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'archived']);
export const transactionTypeEnum = pgEnum('transaction_type', ['expense', 'income', 'transfer', 'investment_contribution', 'investment_withdrawal', 'receivable_create', 'receivable_receive', 'liability_create', 'liability_payment', 'credit_card_purchase', 'credit_card_payment', 'adjustment', 'opening_balance']);
export const transactionStatusEnum = pgEnum('transaction_status', ['active', 'pending_sync', 'deleted', 'voided']);
export const transactionSourceEnum = pgEnum('transaction_source', ['web', 'shortcut', 'import', 'recurring', 'system', 'manual']);
export const legDirectionEnum = pgEnum('leg_direction', ['debit', 'credit']);
export const categoryTypeEnum = pgEnum('category_type', ['expense', 'income', 'both']);
export const allocationStatusEnum = pgEnum('allocation_status', ['active', 'archived']);
export const lienSourceEnum = pgEnum('lien_source', ['manual', 'statement_import', 'reconciliation']);
export const receivableStatusEnum = pgEnum('receivable_status', ['open', 'partially_received', 'received', 'cancelled']);
export const liabilityTypeEnum = pgEnum('liability_type', ['person', 'bank', 'credit_card', 'other']);
export const liabilityStatusEnum = pgEnum('liability_status', ['open', 'partially_paid', 'paid', 'cancelled']);
export const assetTypeEnum = pgEnum('asset_type', ['mutual_fund', 'equity', 'etf', 'other']);
export const investmentTransactionTypeEnum = pgEnum('investment_transaction_type', ['buy', 'sell', 'contribution', 'withdrawal', 'dividend', 'other']);
export const heldForOtherStatusEnum = pgEnum('held_for_other_status', ['open', 'returned', 'cancelled']);
export const recurringTypeEnum = pgEnum('recurring_type', ['income', 'expense']);
export const recurringFrequencyEnum = pgEnum('recurring_frequency', ['monthly']);
export const recurringDayRuleEnum = pgEnum('recurring_day_rule', ['first_day', 'last_working_day', 'custom_day']);
export const recurringOccurrenceStatusEnum = pgEnum('recurring_occurrence_status', ['pending', 'confirmed', 'received_early', 'will_receive_later', 'skipped', 'created']);
export const statementImportStatusEnum = pgEnum('statement_import_status', ['uploaded', 'processing', 'review', 'confirmed', 'failed', 'cancelled']);
export const duplicateStatusEnum = pgEnum('duplicate_status', ['none', 'possible_duplicate', 'confirmed_duplicate']);
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'accepted', 'edited', 'rejected']);
export const matchTypeEnum = pgEnum('match_type', ['exact', 'contains', 'prefix', 'regex']);

// 3. Workspace
export const workspace = pgTable('workspace', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  baseCurrency: char('base_currency', { length: 3 }).notNull(),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const workspaceMember = pgTable('workspace_member', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  status: memberStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('workspace_member_workspace_user_idx').on(t.workspaceId, t.userId),
]);

// 4. Financial Account
export const financialAccount = pgTable('financial_account', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  accountType: accountTypeEnum('account_type').notNull(),
  institutionName: text('institution_name'),
  currency: char('currency', { length: 3 }).notNull(),
  color: text('color'),
  iconKey: text('icon_key'),
  openingBalanceMinor: bigint('opening_balance_minor', { mode: 'bigint' }).notNull(),
  openingBalanceDate: date('opening_balance_date').notNull(),
  status: accountStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 5. Account Balance State
export const accountState = pgTable('account_state', {
  financialAccountId: uuid('financial_account_id').primaryKey().references(() => financialAccount.id, { onDelete: 'cascade' }),
  lienAmountMinor: bigint('lien_amount_minor', { mode: 'bigint' }).notNull().default(0n),
  reconciledBalanceMinor: bigint('reconciled_balance_minor', { mode: 'bigint' }),
  lastReconciledAt: timestamp('last_reconciled_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. Transaction
export const transaction = pgTable('transaction', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  transactionType: transactionTypeEnum('transaction_type').notNull(),
  status: transactionStatusEnum('status').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  transactionDate: date('transaction_date').notNull(),
  description: text('description'),
  merchantName: text('merchant_name'),
  note: text('note'),
  categoryId: uuid('category_id'), // fk added later to avoid circular logic or self-ref easily
  subcategoryId: uuid('subcategory_id'),
  source: transactionSourceEnum('source').notNull(),
  clientTransactionId: uuid('client_transaction_id'),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('transaction_workspace_client_tx_idx').on(t.workspaceId, t.clientTransactionId).where(sql`${t.clientTransactionId} IS NOT NULL`),
  index('transaction_workspace_date_idx').on(t.workspaceId, t.transactionDate),
]);

// 7. Transaction Legs
export const transactionLeg = pgTable('transaction_leg', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').notNull().references(() => transaction.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => financialAccount.id, { onDelete: 'restrict' }),
  direction: legDirectionEnum('direction').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  legRole: text('leg_role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('transaction_leg_tx_idx').on(t.transactionId),
  index('transaction_leg_account_idx').on(t.accountId),
]);

// 8. Categories
export const category = pgTable('category', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id'), // null for system
  name: text('name').notNull(),
  parentId: uuid('parent_id'),
  categoryType: categoryTypeEnum('category_type').notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  iconKey: text('icon_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [
  index('category_workspace_idx').on(t.workspaceId),
]);

// 9. Tags
export const tag = pgTable('tag', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('tag_workspace_idx').on(t.workspaceId),
]);

export const transactionTag = pgTable('transaction_tag', {
  transactionId: uuid('transaction_id').notNull().references(() => transaction.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tag.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.transactionId, t.tagId] }),
]);

// 10. Allocations
export const allocation = pgTable('allocation', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: allocationStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const transactionAllocation = pgTable('transaction_allocation', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').notNull().references(() => transaction.id, { onDelete: 'cascade' }),
  allocationId: uuid('allocation_id').notNull().references(() => allocation.id, { onDelete: 'restrict' }),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  percentage: numeric('percentage'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 11. Liens
export const lienSnapshot = pgTable('lien_snapshot', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialAccountId: uuid('financial_account_id').notNull().references(() => financialAccount.id, { onDelete: 'cascade' }),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  source: lienSourceEnum('source').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 12. Receivables
export const receivable = pgTable('receivable', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  counterpartyName: text('counterparty_name').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  createdDate: date('created_date').notNull(),
  expectedDate: date('expected_date'),
  status: receivableStatusEnum('status').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const receivableSettlement = pgTable('receivable_settlement', {
  id: uuid('id').defaultRandom().primaryKey(),
  receivableId: uuid('receivable_id').notNull().references(() => receivable.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => transaction.id, { onDelete: 'restrict' }),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  settledAt: timestamp('settled_at', { withTimezone: true }).notNull(),
});

// 13. Liabilities
export const liability = pgTable('liability', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  counterpartyName: text('counterparty_name').notNull(),
  liabilityType: liabilityTypeEnum('liability_type').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  createdDate: date('created_date').notNull(),
  dueDate: date('due_date'),
  status: liabilityStatusEnum('status').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const liabilityPayment = pgTable('liability_payment', {
  id: uuid('id').defaultRandom().primaryKey(),
  liabilityId: uuid('liability_id').notNull().references(() => liability.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => transaction.id, { onDelete: 'restrict' }),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
});

// 14. Investment Model
export const investmentPosition = pgTable('investment_position', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  financialAccountId: uuid('financial_account_id').notNull().references(() => financialAccount.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  symbol: text('symbol'),
  assetType: assetTypeEnum('asset_type').notNull(),
  units: numeric('units'),
  averageCostMinor: bigint('average_cost_minor', { mode: 'bigint' }),
  currency: char('currency', { length: 3 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const investmentTransaction = pgTable('investment_transaction', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  positionId: uuid('position_id').notNull().references(() => investmentPosition.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => transaction.id, { onDelete: 'restrict' }),
  transactionType: investmentTransactionTypeEnum('transaction_type').notNull(),
  units: numeric('units'),
  priceMinor: bigint('price_minor', { mode: 'bigint' }),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  transactionDate: date('transaction_date').notNull(),
});

export const investmentPriceSnapshot = pgTable('investment_price_snapshot', {
  id: uuid('id').defaultRandom().primaryKey(),
  positionId: uuid('position_id').notNull().references(() => investmentPosition.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  symbol: text('symbol'),
  priceMinor: bigint('price_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  isEstimated: boolean('is_estimated').notNull(),
  sourceMetadata: jsonb('source_metadata'),
});

// 15. Money Held for Others
export const heldForOther = pgTable('held_for_other', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => financialAccount.id, { onDelete: 'cascade' }),
  counterpartyName: text('counterparty_name').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  status: heldForOtherStatusEnum('status').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 16. Recurring Items
export const recurringItem = pgTable('recurring_item', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  type: recurringTypeEnum('type').notNull(),
  name: text('name').notNull(),
  expectedAmountMinor: bigint('expected_amount_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  categoryId: uuid('category_id'), // fk omitted to avoid hard dependency on categories if needed, or we add later
  defaultAccountId: uuid('default_account_id'),
  frequency: recurringFrequencyEnum('frequency').notNull(),
  dayRule: recurringDayRuleEnum('day_rule').notNull(),
  customDay: integer('custom_day'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const recurringOccurrence = pgTable('recurring_occurrence', {
  id: uuid('id').defaultRandom().primaryKey(),
  recurringItemId: uuid('recurring_item_id').notNull().references(() => recurringItem.id, { onDelete: 'cascade' }),
  expectedDate: date('expected_date').notNull(),
  status: recurringOccurrenceStatusEnum('status').notNull(),
  actualDate: date('actual_date'),
  actualAmountMinor: bigint('actual_amount_minor', { mode: 'bigint' }),
  transactionId: uuid('transaction_id').references(() => transaction.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('recurring_occurrence_item_date_idx').on(t.recurringItemId, t.expectedDate),
]);

// 17. Statement Imports
export const statementImport = pgTable('statement_import', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  financialAccountId: uuid('financial_account_id').notNull().references(() => financialAccount.id, { onDelete: 'cascade' }),
  fileObjectKey: text('file_object_key').notNull(),
  originalFilename: text('original_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: bigint('file_size', { mode: 'bigint' }).notNull(),
  status: statementImportStatusEnum('status').notNull(),
  statementStartDate: date('statement_start_date'),
  statementEndDate: date('statement_end_date'),
  extractedClosingBalanceMinor: bigint('extracted_closing_balance_minor', { mode: 'bigint' }),
  extractedClosingBalanceCurrency: char('extracted_closing_balance_currency', { length: 3 }),
  lienAmountMinor: bigint('lien_amount_minor', { mode: 'bigint' }),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const statementImportRow = pgTable('statement_import_row', {
  id: uuid('id').defaultRandom().primaryKey(),
  statementImportId: uuid('statement_import_id').notNull().references(() => statementImport.id, { onDelete: 'cascade' }),
  rowNumber: integer('row_number').notNull(),
  transactionDate: date('transaction_date').notNull(),
  description: text('description').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  direction: legDirectionEnum('direction').notNull(),
  referenceId: text('reference_id'),
  normalizedMerchant: text('normalized_merchant'),
  suggestedCategoryId: uuid('suggested_category_id'),
  confidence: numeric('confidence'),
  duplicateStatus: duplicateStatusEnum('duplicate_status').notNull().default('none'),
  reviewStatus: reviewStatusEnum('review_status').notNull().default('pending'),
  committedTransactionId: uuid('committed_transaction_id').references(() => transaction.id, { onDelete: 'set null' }),
});

// 18. Merchant Rules
export const merchantRule = pgTable('merchant_rule', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  matchType: matchTypeEnum('match_type').notNull(),
  pattern: text('pattern').notNull(),
  merchantName: text('merchant_name'),
  categoryId: uuid('category_id').notNull(),
  subcategoryId: uuid('subcategory_id'),
  priority: integer('priority').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 19. Reconciliation
export const reconciliation = pgTable('reconciliation', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  financialAccountId: uuid('financial_account_id').notNull().references(() => financialAccount.id, { onDelete: 'cascade' }),
  reconciliationDate: date('reconciliation_date').notNull(),
  calculatedBalanceMinor: bigint('calculated_balance_minor', { mode: 'bigint' }).notNull(),
  actualBalanceMinor: bigint('actual_balance_minor', { mode: 'bigint' }).notNull(),
  differenceMinor: bigint('difference_minor', { mode: 'bigint' }).notNull(),
  adjustmentTransactionId: uuid('adjustment_transaction_id').references(() => transaction.id, { onDelete: 'set null' }),
  note: text('note'),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 20. Shortcut Tokens
export const shortcutToken = pgTable('shortcut_token', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('shortcut_token_hash_idx').on(t.tokenHash),
]);

// 21. Sync / Idempotency
export const idempotencyKey = pgTable('idempotency_key', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  scope: text('scope').notNull(),
  keyHash: text('key_hash').notNull(),
  requestFingerprint: text('request_fingerprint'),
  responsePayload: jsonb('response_payload'),
  resourceType: text('resource_type'),
  resourceId: uuid('resource_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('idempotency_workspace_scope_hash_idx').on(t.workspaceId, t.scope, t.keyHash),
]);

// 22. Audit
export const auditEvent = pgTable('audit_event', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  beforeData: jsonb('before_data'),
  afterData: jsonb('after_data'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('audit_event_workspace_entity_idx').on(t.workspaceId, t.entityType, t.entityId),
  index('audit_event_workspace_date_idx').on(t.workspaceId, t.createdAt),
]);

// 23. Notifications
export const notification = pgTable('notification', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 24. Budgets
export const budget = pgTable('budget', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => category.id, { onDelete: 'restrict' }),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  periodStartDate: date('period_start_date').notNull(),
  periodEndDate: date('period_end_date').notNull(),
  notifyThresholdPercent: numeric('notify_threshold_percent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('chk_budget_amount', sql`${t.amountMinor} >= 0`),
  check('chk_budget_dates', sql`${t.periodEndDate} >= ${t.periodStartDate}`),
  check('chk_budget_threshold', sql`${t.notifyThresholdPercent} >= 0 AND ${t.notifyThresholdPercent} <= 100`),
  uniqueIndex('budget_workspace_category_period_idx').on(t.workspaceId, t.categoryId, t.periodStartDate),
  index('budget_workspace_period_idx').on(t.workspaceId, t.periodStartDate),
]);

import { relations } from 'drizzle-orm';

export const transactionRelations = relations(transaction, ({ one, many }) => ({
  category: one(category, {
    fields: [transaction.categoryId],
    references: [category.id],
  }),
  legs: many(transactionLeg),
}));

export const transactionLegRelations = relations(transactionLeg, ({ one }) => ({
  transaction: one(transaction, {
    fields: [transactionLeg.transactionId],
    references: [transaction.id],
  }),
  account: one(financialAccount, {
    fields: [transactionLeg.accountId],
    references: [financialAccount.id],
  }),
}));

export const financialAccountRelations = relations(financialAccount, ({ many }) => ({
  legs: many(transactionLeg),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  transactions: many(transaction),
}));
