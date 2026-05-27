const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_94vfQqoLJRwd@ep-round-moon-amufv3ay-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // Check for ANY recent MpesaCallback logs from today
    console.log("Checking for recent callbacks...");
    const callbacks = await pool.query(`
      SELECT * FROM "MpesaCallback" 
      ORDER BY "createdAt" DESC 
      LIMIT 10
    `);

    // Check for ANY recent Repayments
    console.log("Checking for recent repayments...");
    const repayments = await pool.query(`
      SELECT * FROM "Repayment" 
      ORDER BY "paymentDate" DESC 
      LIMIT 5
    `);

    const output = {
      timestamp: new Date().toISOString(),
      recentCallbacks: callbacks.rows,
      recentRepayments: repayments.rows
    };

    fs.writeFileSync('payment-debug.json', JSON.stringify(output, null, 2));
    console.log("Audit complete. Check payment-debug.json");
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await pool.end();
  }
}
main();
