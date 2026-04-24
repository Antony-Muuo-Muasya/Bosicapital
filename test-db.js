const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_94vfQqoLJRwd@ep-round-moon-amufv3ay-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // Check the organizationId value on loans
    const loans = await pool.query(`SELECT id, "organizationId", status FROM "Loan" LIMIT 5`);
    // Check the organizationId value on repayments
    const repayments = await pool.query(`SELECT id, "organizationId", "loanId", amount FROM "Repayment" ORDER BY "paymentDate" DESC LIMIT 5`);
    // Check for callbacks that were not matched
    const failedCallbacks = await pool.query(`SELECT * FROM "MpesaCallback" WHERE status != 'Processed' ORDER BY "createdAt" DESC LIMIT 10`);
    // Check all MpesaCallbacks
    const allCallbacks = await pool.query(`SELECT * FROM "MpesaCallback" ORDER BY "createdAt" DESC LIMIT 10`);

    const output = {
      loans: loans.rows,
      repayments: repayments.rows,
      failedCallbacks: failedCallbacks.rows,
      allCallbacks: allCallbacks.rows,
    };

    fs.writeFileSync('db-audit.json', JSON.stringify(output, null, 2));
    console.log("Done. Check db-audit.json");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
