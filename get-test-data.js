const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function getData() {
  try {
    const results = await sql.query('SELECT b."nationalId", b.phone, l.id as loan_id FROM "Borrower" b JOIN "Loan" l ON b.id = l."borrowerId" WHERE l.status = \'Active\' LIMIT 3');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("Query Error:", error.message);
  }
}

getData();
