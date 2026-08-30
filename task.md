# Phase 6 — Advanced Core Features

## Scope & Sequence
1. **Budgets**: Implement domain logic to create budgets and calculate actuals against them using existing ledger transaction tables. Build `/budgets` UI.
2. **Recurring Transactions**: Implement domain logic to create recurring items and generate/confirm occurrences. Build `/recurring` UI.
3. **Statement Imports**: Implement CSV parsing, duplicate detection, review UI, and atomic commitment of imported rows. Build `/imports` UI.
4. **Verification**: Run `tsc`, `lint`, `vitest`, `build`, and ensure idempotency/duplicate-prevention.

## Checklist

- [x] **Budgets**
  - [x] `src/lib/services/budget.ts` (CRUD operations)
  - [x] `src/lib/ledger/budget.ts` (Actuals calculation using `transaction` table)
  - [x] `/budgets` UI (List and Create form)

- [x] **Recurring Transactions**
  - [x] `src/lib/services/recurring.ts` (CRUD and occurrence generation)
  - [x] `/recurring` UI (List items, confirm pending occurrences)
  - [x] Occurrence confirmation securely hooks into `createExpense`/`createIncome`

- [x] **Statement Imports**
  - [x] `src/lib/services/import.ts` (CSV parsing and row insertion)
  - [x] Duplicate detection logic against existing `transaction` table
  - [x] `/imports` UI (Upload CSV, review rows, commit batch)
  - [x] Atomic commitment of rows securely hooks into domain services

- [ ] **Testing & Validation**
  - [ ] Vitest tests for budgets, recurring, and imports
  - [ ] Idempotency/duplicate-prevention verification
  - [ ] Verification gates (tsc, eslint, build, vitest)
