import { NextRequest } from "next/server";
import withAuth from "next-auth/middleware";

export function proxy(req: NextRequest) {
  return (withAuth as any)(req);
}

export default proxy;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/borrowers/:path*",
    "/loans/:path*",
    "/repayments/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/branches/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/approvals/:path*",
    "/disbursements/:path*",
  ],
};
