import { db } from './src/lib/db';

async function check() {
  const cbCount = await db('SELECT COUNT(*) as count FROM "MpesaCallback"');
  const repCount = await db('SELECT COUNT(*) as count FROM "Repayment"');
  const regCount = await db('SELECT COUNT(*) as count FROM "RegistrationPayment"');
  
  console.log(`Callbacks: ${cbCount[0].count}`);
  console.log(`Repayments: ${repCount[0].count}`);
  console.log(`RegPayments: ${regCount[0].count}`);

  const failed = await db('SELECT * FROM "MpesaCallback" WHERE status = \'Failed\' ORDER BY "createdAt" DESC LIMIT 3');
  console.log("FAILED CALLBACKS:");
  console.log(JSON.stringify(failed, null, 2));
  
  process.exit(0);
}
check();
