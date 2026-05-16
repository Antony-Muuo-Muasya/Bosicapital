const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_94vfQqoLJRwd@ep-round-moon-amufv3ay-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // Check the exact query used by getLoans
    const loansQuery = `
      SELECT l.*, 
             lp.name as "productName", lp.category as "productCategory",
             json_agg(i.*) as installments
      FROM "Loan" l
      LEFT JOIN "LoanProduct" lp ON l."loanProductId" = lp.id
      LEFT JOIN "Installment" i ON l.id = i."loanId"
      WHERE 1=1
      GROUP BY l.id, lp.id ORDER BY l."issueDate" DESC
    `;
    const loans = await pool.query(loansQuery);
    console.log('Query returned count:', loans.rows.length);
    if (loans.rows.length > 0) {
        console.log('First loan:', JSON.stringify(loans.rows[0], null, 2));
    }
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
