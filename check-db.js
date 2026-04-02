const fs = require('fs');
const { Pool } = require('pg');

async function main() {
  const env = fs.readFileSync('.env', 'utf8');
  const dbLine = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
  const dbUrl = dbLine.split('=')[1].trim().replace(/['"]/g, '');

  const pool = new Pool({ connectionString: dbUrl });
  const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'User'`);
  console.log(res.rows);
  await pool.end();
}
main();
