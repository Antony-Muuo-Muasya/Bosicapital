import { db } from './src/lib/db';

async function run() {
    try {
        await db(`ALTER TABLE "User" ADD COLUMN "rawPassword" TEXT`);
        console.log("Success");
    } catch (e) {
        console.error(e);
    }
}
run();
