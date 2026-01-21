'use client';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '../ui/skeleton';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Overdue': return 'destructive';
    case 'Partial': return 'secondary';
    default: return 'outline';
  }
};

interface DueLoan {
    id: string;
    loanId: string;
    dueDate: string;
    expectedAmount: number;
    paidAmount: number;
    status: string;
    borrowerName: string;
    borrowerPhotoUrl: string;
}

interface DueLoansTableProps {
    dueInstallments: DueLoan[] | null;
    isLoading: boolean;
}


export function DueLoansTable({ dueInstallments, isLoading }: DueLoansTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Upcoming & Overdue Payments</CardTitle>
                <CardDescription>A real-time list of installments requiring attention.</CardDescription>
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
                        {isLoading && Array.from({ length: 5 }).map((_, i) => (
                             <TableRow key={i}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-9 w-9 rounded-full" />
                                        <div className='grid gap-1'>
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-6 w-16" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && dueInstallments && dueInstallments.map((installment) => (
                            <TableRow key={installment.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="hidden h-9 w-9 sm:flex">
                                            <AvatarImage src={installment.borrowerPhotoUrl} alt={installment.borrowerName} />
                                            <AvatarFallback>{installment.borrowerName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="grid gap-0.5">
                                            <span className="font-medium">{installment.borrowerName}</span>
                                            <span className="text-xs text-muted-foreground">{installment.loanId}</span>
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
                        ))}
                         {!isLoading && (!dueInstallments || dueInstallments.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No due payments at the moment.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
