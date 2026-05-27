import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId') || "default";

  const results: Record<string, any> = {};

  const queries: Record<string, [string, any[]]> = {
    loans: [`SELECT id, status, principal FROM "Loan" WHERE "organizationId" = $1 LIMIT 2`, [orgId]],
    borrowers: [`SELECT id FROM "Borrower" WHERE "organizationId" = $1 LIMIT 2`, [orgId]],
    loanProducts: [`SELECT id, category FROM "LoanProduct" WHERE "organizationId" = $1 LIMIT 2`, [orgId]],
    users: [`SELECT id, "fullName" FROM "User" WHERE "organizationId" = $1 LIMIT 2`, [orgId]],
    branches: [`SELECT id, name FROM "Branch" WHERE "organizationId" = $1 LIMIT 2`, [orgId]],
    regPayments: [`SELECT id, amount FROM "RegistrationPayment" WHERE "organizationId" = $1 LIMIT 2`, [orgId]],
    repayments: [`SELECT id, amount FROM "Repayment" WHERE "organizationId" = $1 LIMIT 2`, [orgId]],
    installments: [`SELECT id, status FROM "Installment" WHERE "organizationId" = $1 LIMIT 2`, [orgId]],
    roles: [`SELECT id, name FROM "Role" LIMIT 5`, []],
    loanPortfolio: [`SELECT COALESCE(SUM("totalPayable"), 0) as "totalPayable" FROM "Loan" WHERE "organizationId" = $1 AND status = 'Active'`, [orgId]],
  };

  for (const [key, [query, params]] of Object.entries(queries)) {
    try {
      results[key] = await db(query, params);
    } catch (e: any) {
      results[key] = { ERROR: e.message };
    }
  }

  return NextResponse.json(results);
}
