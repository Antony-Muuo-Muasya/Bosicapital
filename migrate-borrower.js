const fs = require('fs');
const { Pool } = require('pg');

async function main() {
  const env = fs.readFileSync('.env', 'utf8');
  const dbLine = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
  const dbUrl = dbLine.split('=')[1].trim().replace(/['"]/g, '');

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  
  console.log('Adding columns to Borrower table...');
  try {
    await pool.query(`ALTER TABLE "Borrower" ADD COLUMN IF NOT EXISTS "createdBy" TEXT`);
    await pool.query(`ALTER TABLE "Borrower" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);
    console.log('Columns added successfully.');
  } catch (err) {
    console.error('Error adding columns:', err);
  }
  
  await pool.end();
}
main();
