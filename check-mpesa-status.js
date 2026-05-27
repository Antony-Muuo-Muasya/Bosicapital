const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function checkStatus() {
  try {
    const results = await sql.query('SELECT * FROM "MpesaCallback" ORDER BY id DESC LIMIT 10');
    console.log("Full Results:", results);
  } catch (error) {
    console.error("Query Error:", error.message);
  }
}

checkStatus();
