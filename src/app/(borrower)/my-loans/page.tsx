'use client';
import { PageHeader } from "@/components/page-header";

export default function MyLoansPage() {
    return (
        <div className="container max-w-5xl py-8">
            <PageHeader title="My Loans" description="Details of your loan and repayment schedule." />
             <div className="border shadow-sm rounded-lg p-8 mt-6 text-center text-muted-foreground">
                Your loan details and repayment schedule will be displayed here.
            </div>
        </div>
    )
}
