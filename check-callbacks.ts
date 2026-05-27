import { db } from './src/lib/db';

async function check() {
  const latest = await db('SELECT * FROM "MpesaCallback" ORDER BY "createdAt" DESC LIMIT 5');
  console.log(JSON.stringify(latest, null, 2));
}
check();
