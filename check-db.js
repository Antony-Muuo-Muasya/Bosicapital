const fs = require('fs');
const { Pool } = require('pg');

async function main() {
  const env = fs.readFileSync('.env', 'utf8');
  const dbLine = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
  const dbUrl = dbLine.split('=')[1].trim().replace(/['"]/g, '');

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Target'`);
  console.log('Target Columns:', res.rows.map(r => r.column_name));
  await pool.end();
}
main();
