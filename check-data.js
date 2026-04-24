const { neon } = require('@neondatabase/serverless');
const DATABASE_URL = "postgresql://neondb_owner:npg_94vfQqoLJRwd@ep-round-moon-amufv3ay-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function checkCallbacks() {
  try {
    const res = await sql.query('SELECT id, "transId", "billRefNumber", msisdn, status, "errorMessage", "createdAt" FROM "MpesaCallback" ORDER BY "createdAt" DESC LIMIT 5');
    console.log('Latest Callbacks:', JSON.stringify(res.rows || res, null, 2));

    const res2 = await sql.query('SELECT id, "transId", amount, "paymentDate" FROM "Repayment" ORDER BY "paymentDate" DESC LIMIT 5');
    console.log('Latest Repayments:', JSON.stringify(res2.rows || res2, null, 2));

  } catch (error) {
    console.error('Error checking data:', error);
  }
}

checkCallbacks();
