import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sqlQuery = neon(process.env.DATABASE_URL);
const db = drizzle(sqlQuery);

async function run() {
  console.log('Migrating database for account and account-type ordering...');

  await db.execute(sql`
    ALTER TABLE "financial_account" 
    ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0 NOT NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "workspace" 
    ADD COLUMN IF NOT EXISTS "account_type_order" jsonb;
  `);

  console.log('Migration completed successfully.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
