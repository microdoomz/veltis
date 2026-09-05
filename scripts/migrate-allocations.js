const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('Migrating allocation table columns...');
  await sql`ALTER TABLE allocation ADD COLUMN IF NOT EXISTS financial_account_id uuid REFERENCES financial_account(id) ON DELETE CASCADE;`;
  await sql`ALTER TABLE allocation ADD COLUMN IF NOT EXISTS amount_minor bigint NOT NULL DEFAULT 0;`;
  await sql`ALTER TABLE allocation ADD COLUMN IF NOT EXISTS color text;`;
  console.log('Allocation columns migrated successfully.');
}

migrate().catch(console.error);
