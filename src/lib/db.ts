import { neon } from '@neondatabase/serverless';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

/**
 * Enhanced DB client that supports both:
 * 1. Template literals: db`SELECT * FROM users WHERE id = ${id}`
 * 2. Parameterized strings: db("SELECT * FROM users WHERE id = $1", [id])
 */
export const db = ((first: any, ...rest: any[]) => {
  if (!sql) {
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
       console.warn('DATABASE_URL is not set, database operations will fail.');
    }
    return Promise.reject(new Error('DATABASE_URL is not set in environment variables'));
  }
  const promise = (Array.isArray(first) && 'raw' in (first as any))
    ? (sql as any)(first, ...rest) 
    : (sql as any).query(first, rest[0] || []);

  return promise.then((res: any) => {
      // .query() returns an object with a .rows property, whereas tagged literals return the array directly. Normalize it!
      return res.rows ? res.rows : res;
  });
}) as any;

export default db;
