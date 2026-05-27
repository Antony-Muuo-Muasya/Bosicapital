const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_94vfQqoLJRwd@ep-round-moon-amufv3ay-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const orgs = await pool.query(`SELECT id, name FROM "Organization"`);
    orgs.rows.forEach(o => console.log(`ID: ${o.id}, Name: ${o.name}`));
    const loans = await pool.query(`SELECT id, "organizationId" FROM "Loan"`);
    loans.rows.forEach(l => console.log(`Loan ID: ${l.id}, Org ID: ${l.organizationId}`));
    const borrowers = await pool.query(`SELECT COUNT(*) FROM "Borrower"`);
    console.log(`Total Borrowers: ${borrowers.rows[0].count}`);
    const products = await pool.query(`SELECT COUNT(*) FROM "LoanProduct"`);
    console.log(`Total LoanProducts: ${products.rows[0].count}`);
    const branches = await pool.query(`SELECT id, name FROM "Branch"`);
    branches.rows.forEach(br => console.log(`Branch: ${br.name}, ID: ${br.id}`));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
