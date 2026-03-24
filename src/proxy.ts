import withAuth from "next-auth/middleware";
export default withAuth;

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
