const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

async function check() {
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'allocation'`;
  console.log('allocation columns:', cols);
  const lienCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lien_snapshot'`;
  console.log('lien_snapshot columns:', lienCols);
  const accountStateCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'account_state'`;
  console.log('account_state columns:', accountStateCols);
}
check().catch(console.error);
