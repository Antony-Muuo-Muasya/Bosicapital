'use client'

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import type { Repayment } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';


// Mock data for repayments
const mockRepayments: (Repayment & { borrowerName: string; loanProductName: string })[] = [
    { id: 'rep-1', loanId: 'loan-1', amount: 71.88, paymentDate: '2024-06-01', collectedById: 'user-2', method: 'Mobile Money', borrowerName: 'Jane Smith', loanProductName: 'Motorcycle Loan' },
    { id: 'rep-2', loanId: 'loan-2', amount: 180.56, paymentDate: '2024-06-10', collectedById: 'user-2', method: 'Bank Transfer', borrowerName: 'John Doe', loanProductName: 'Small Business Boost' },
    { id: 'rep-3', loanId: 'loan-2', amount: 180.56, paymentDate: '2024-05-10', collectedById: 'user-2', method: 'Bank Transfer', borrowerName: 'John Doe', loanProductName: 'Small Business Boost' },
    { id: 'rep-4', loanId: 'loan-3', amount: 91.67, paymentDate: '2024-05-15', collectedById: 'user-3', method: 'Cash', borrowerName: 'Emily White', loanProductName: 'School Fees Support' },
];


export default function RepaymentsPage() {

    const handleExport = () => {
        const headers = ['ID', 'Loan ID', 'Borrower Name', 'Loan Product', 'Amount', 'Payment Date', 'Method', 'Collected By'];
        const csvRows = [
            headers.join(','),
            ...mockRepayments.map(row => 
                [
                    row.id,
                    row.loanId,
                    `"${row.borrowerName}"`,
                    `"${row.loanProductName}"`,
                    row.amount,
                    row.paymentDate,
                    row.method,
                    row.collectedById
                ].join(',')
            )
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.href) {
            URL.revokeObjectURL(link.href);
        }
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', 'repayments_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

  return (
    <>
      <PageHeader title="Repayments" description="Record and track all incoming payments.">
        <Button variant="outline" onClick={handleExport}>
          <FileDown className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        <Card>
            <CardHeader>
                <CardTitle>Repayment History</CardTitle>
                <CardDescription>A log of all payments received from borrowers.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Borrower</TableHead>
                            <TableHead>Loan Product</TableHead>
                            <TableHead>Payment Date</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockRepayments.map((repayment) => (
                            <TableRow key={repayment.id}>
                                <TableCell>
                                    <div className="font-medium">{repayment.borrowerName}</div>
                                    <div className="text-sm text-muted-foreground">{repayment.loanId}</div>
                                </TableCell>
                                <TableCell>{repayment.loanProductName}</TableCell>
                                <TableCell>{new Date(repayment.paymentDate).toLocaleDateString()}</TableCell>
                                <TableCell>{repayment.method}</TableCell>
                                <TableCell className="text-right">{formatCurrency(repayment.amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
