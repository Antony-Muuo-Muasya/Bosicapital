const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_94vfQqoLJRwd@ep-round-moon-amufv3ay-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const users = await pool.query(`SELECT email, "organizationId" FROM "User"`);
    console.log('Users:', JSON.stringify(users.rows, null, 2));
    const loans = await pool.query(`SELECT id, "organizationId" FROM "Loan"`);
    console.log('Loans:', JSON.stringify(loans.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
