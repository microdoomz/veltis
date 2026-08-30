import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verify() {
  const sql = neon(process.env.DATABASE_URL!);
  
  // 1. Check Tables
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('--- TABLES ---');
  console.log(`Count: ${tables.length}`);
  const expectedTables = 37; // 31 domain + 6 auth
  if (tables.length >= expectedTables) {
    console.log(`✅ Table count >= 37 (${tables.length})`);
  } else {
    console.error(`❌ Table count mismatch: expected at least ${expectedTables}, got ${tables.length}`);
  }
  
  // 2. Check Budget Constraints
  console.log('\n--- BUDGET CONSTRAINTS ---');
  const constraints = await sql`
    SELECT conname, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'budget'
  `;
  for (const c of constraints) {
    console.log(`${c.conname}: ${c.def}`);
  }
  
  // 3. Check Enums
  console.log('\n--- ENUMS ---');
  const enums = await sql`
    SELECT typname, string_agg(enumlabel, ', ') as values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    GROUP BY typname
  `;
  console.log(`Count: ${enums.length}`);
  
  // 4. Check Types of monetary fields
  console.log('\n--- MONETARY FIELD TYPES ---');
  const cols = await sql`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE column_name IN ('opening_balance_minor', 'lien_amount_minor', 'reconciled_balance_minor', 'amount_minor')
      AND table_schema = 'public'
    ORDER BY table_name, column_name
  `;
  for (const col of cols) {
    console.log(`${col.table_name}.${col.column_name}: ${col.data_type}`);
  }
}

verify().catch(console.error);
