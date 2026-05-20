require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
    try {
        await sql(`ALTER TABLE "User" ADD COLUMN "rawPassword" TEXT`);
        console.log("Success");
    } catch (e) {
        console.error(e);
    }
}
run();
