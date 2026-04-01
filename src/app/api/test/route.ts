import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const rawSql = neon(process.env.DATABASE_URL as string);
    
    // Test 1: template literal
    const test1 = await rawSql`SELECT 1 as result`;
    
    // Test 2: through our db wrapper
    const test2 = await db('SELECT 1 as result');
    
    // Test 3: with params?
    let test3;
    try {
        test3 = await db('SELECT $1::int as result', [1]);
    } catch (e: any) {
        test3 = { error: e.message, stack: e.stack };
    }

    // Test 4: query object?
    let test4;
    try {
        test4 = await (rawSql as any).query('SELECT 1');
    } catch (e: any) {
        test4 = { error: e.message };
    }

    // Test 5: raw function call with array?
    let test5;
    try {
        test5 = await (rawSql as any)('SELECT $1::int', [1]);
    } catch (e: any) {
        test5 = { error: e.message };
    }

    return NextResponse.json({ test1, test2, test3, test4, test5 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
