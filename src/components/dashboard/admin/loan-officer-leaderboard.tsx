'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy } from 'lucide-react';


export interface LeaderboardEntry {
    officerId: string;
    officerName: string;
    officerAvatar?: string;
    loanCount: number;
    totalPrincipal: number;
}

interface LoanOfficerLeaderboardProps {
    leaderboardData: LeaderboardEntry[] | null;
    isLoading: boolean;
}

export function LoanOfficerLeaderboard({ leaderboardData, isLoading }: LoanOfficerLeaderboardProps) {
    
    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader>
                     <Skeleton className="h-6 w-1/2" />
                     <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        )
    }

  return (
    <Card className="h-full">
        <CardHeader>
            <CardTitle>Loan Officer Leaderboard</CardTitle>
            <CardDescription>Top performers by principal disbursed.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Officer</TableHead>
                        <TableHead>Loans</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {leaderboardData && leaderboardData.map((officer, index) => (
                        <TableRow key={officer.officerId}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-muted-foreground w-4">{index+1}{index === 0 && <Trophy className="inline-block h-4 w-4 text-amber-400 ml-1"/>}</span>
                                    <Avatar className="hidden h-9 w-9 sm:flex">
                                        <AvatarImage src={officer.officerAvatar} alt={officer.officerName} />
                                        <AvatarFallback>{officer.officerName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid gap-0.5">
                                        <span className="font-medium">{officer.officerName}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>{officer.loanCount}</TableCell>
                            <TableCell className="text-right">{formatCurrency(officer.totalPrincipal, 'KES')}</TableCell>
                        </TableRow>
                    ))}
                    {!isLoading && (!leaderboardData || leaderboardData.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No loan officer data available.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}
