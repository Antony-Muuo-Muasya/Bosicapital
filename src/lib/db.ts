import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

const sql = neon(process.env.DATABASE_URL);

/**
 * Enhanced DB client that supports both:
 * 1. Template literals: db`SELECT * FROM users WHERE id = ${id}`
 * 2. Parameterized strings: db("SELECT * FROM users WHERE id = $1", [id])
 */
export const db = ((first: any, ...rest: any[]) => {
  if (Array.isArray(first) && 'raw' in (first as any)) {
    // Called as template literal
    return (sql as any)(first, ...rest);
  }
  // Called as function with (query, params)
  // The Neon driver requires the .query method for conventional calls
  return (sql as any).query(first, rest[0]);
}) as any;

export default db;
