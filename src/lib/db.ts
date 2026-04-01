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
  const promise = (Array.isArray(first) && 'raw' in (first as any))
    ? (sql as any)(first, ...rest) 
    : (sql as any).query(first, rest[0] || []);

  return promise.then((res: any) => {
      // .query() returns an object with a .rows property, whereas tagged literals return the array directly. Normalize it!
      return res.rows ? res.rows : res;
  });
}) as any;

export default db;
