import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

config({ path: '.env.local' });

const sqlQuery = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlQuery);

async function run() {
  console.log('Creating rate_limit table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "rate_limit" (
      "key" varchar(255) PRIMARY KEY NOT NULL,
      "points" integer DEFAULT 0 NOT NULL,
      "expires_at" timestamp with time zone NOT NULL
    );
  `);
  console.log('Table created successfully.');
  process.exit(0);
}

run().catch(console.error);
