const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function listTables() {
  try {
    const results = await sql.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Raw Results:", results);
  } catch (error) {
    console.error("Query Error:", error.message);
  }
}

listTables();
