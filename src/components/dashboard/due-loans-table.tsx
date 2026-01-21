import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { installments, loans, borrowers } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Overdue': return 'destructive';
    case 'Partial': return 'secondary';
    default: return 'outline';
  }
};

export function DueLoansTable() {
    const dueInstallments = installments.filter(i => i.status !== 'Paid').slice(0, 5);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upcoming & Overdue Payments</CardTitle>
                <CardDescription>A list of installments requiring attention.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Borrower</TableHead>
                            <TableHead>Amount Due</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dueInstallments.map((installment) => {
                            const loan = loans.find(l => l.id === installment.loanId);
                            const borrower = borrowers.find(b => b.id === loan?.borrowerId);
                            if (!loan || !borrower) return null;

                            return (
                                <TableRow key={installment.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="hidden h-9 w-9 sm:flex">
                                                <AvatarImage src={borrower.photoUrl} alt={borrower.fullName} />
                                                <AvatarFallback>{borrower.fullName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-0.5">
                                                <span className="font-medium">{borrower.fullName}</span>
                                                <span className="text-xs text-muted-foreground">{loan.id}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(installment.expectedAmount - installment.paidAmount)}</TableCell>
                                    <TableCell>{new Date(installment.dueDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={getStatusVariant(installment.status)} className="capitalize">
                                            {installment.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
