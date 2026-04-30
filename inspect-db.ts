import { db } from './src/lib/db';

async function check() {
  try {
    const latest = await db('SELECT * FROM "MpesaCallback" ORDER BY "createdAt" DESC LIMIT 10');
    console.log("RECENT CALLBACKS:");
    console.log(JSON.stringify(latest, null, 2));

    const repayments = await db('SELECT * FROM "Repayment" ORDER BY "paymentDate" DESC LIMIT 5');
    console.log("\nRECENT REPAYMENTS:");
    console.log(JSON.stringify(repayments, null, 2));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
