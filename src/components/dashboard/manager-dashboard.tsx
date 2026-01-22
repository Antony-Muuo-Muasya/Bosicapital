'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from 'react';
import { useUserProfile, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Branch, User as LoanOfficer } from '@/lib/types';
import { Skeleton } from "../ui/skeleton";


const GaugePlaceholder = ({ label }: { label: string }) => (
    <Card className="flex flex-col items-center justify-center p-6 text-center shadow-sm rounded-xl">
        <div className="relative h-[75px] w-[150px] overflow-hidden">
            <div className="absolute top-0 h-[150px] w-[150px] rounded-full border-[20px] border-muted" style={{ clipPath: 'inset(50% 0 0 0)' }}></div>
            <div className="absolute top-0 h-[150px] w-[150px] rounded-full border-[20px] border-primary transition-transform duration-500" 
                 style={{ clipPath: 'inset(50% 0 0 0)', transform: 'rotate(0deg)' }}>
            </div>
            <div className="absolute bottom-0 w-full text-center">
                <span className="text-2xl font-bold">--%</span>
            </div>
        </div>
        <p className="mt-4 text-sm font-medium">{label}</p>
    </Card>
);

export function ManagerDashboard() {
  const firestore = useFirestore();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  
  const allBranchesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(collection(firestore, 'branches'), where('organizationId', '==', userProfile.organizationId));
  }, [firestore, userProfile]);

  const { data: allBranches, isLoading: areBranchesLoading } = useCollection<Branch>(allBranchesQuery);

  const managerBranches = useMemo(() => {
    if (!allBranches || !userProfile?.branchIds) return [];
    return allBranches.filter(branch => userProfile.branchIds.includes(branch.id));
  }, [allBranches, userProfile]);


  const loanOfficersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !userProfile.branchIds || userProfile.branchIds.length === 0) return null;
    return query(
        collection(firestore, 'users'), 
        where('organizationId', '==', userProfile.organizationId),
        where('roleId', '==', 'loan_officer'),
        where('branchIds', 'array-contains-any', userProfile.branchIds)
    );
  }, [firestore, userProfile]);

  const { data: loanOfficers, isLoading: areOfficersLoading } = useCollection<LoanOfficer>(loanOfficersQuery);
  
  const filteredLoanOfficers = useMemo(() => {
    if (!loanOfficers) return [];
    if (selectedBranch === 'all') return loanOfficers;
    return loanOfficers.filter(officer => officer.branchIds.includes(selectedBranch));
  }, [loanOfficers, selectedBranch]);


  const isLoading = isProfileLoading || areBranchesLoading || areOfficersLoading;

  return (
    <div className="min-h-screen">
      <main className="p-4 md:p-6 space-y-8">
        {/* Filter Row */}
        <div className="flex flex-col md:flex-row gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full md:w-[200px]" />
              <Skeleton className="h-10 w-full md:w-[200px]" />
            </>
          ) : (
            <>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full md:w-[200px] bg-card shadow-sm rounded-lg">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {managerBranches?.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger className="w-full md:w-[200px] bg-card shadow-sm rounded-lg">
                  <SelectValue placeholder="Select RO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ROs</SelectItem>
                  {filteredLoanOfficers.map(officer => (
                      <SelectItem key={officer.id} value={officer.id}>{officer.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* SECTION 1: Summary Cards Grid */}
        <section>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-medium text-muted-foreground">Outstanding Loan Balance</CardTitle>
                <CardDescription>Sub-label placeholder</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-10"></div>
                <p className="text-xs text-muted-foreground text-right">Placeholder</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-medium text-muted-foreground">Performing Loan Balance</CardTitle>
                <CardDescription>Sub-label placeholder</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-10"></div>
                <p className="text-xs text-muted-foreground text-right">Placeholder</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-medium text-muted-foreground">Total Customers</CardTitle>
                <CardDescription>Sub-label placeholder</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-10"></div>
                <p className="text-xs text-muted-foreground text-right">YTD</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SECTION 2: Customers Overview */}
        <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-xl shadow-sm">
                    <CardHeader><CardTitle className="text-base">Active Customers</CardTitle></CardHeader>
                    <CardContent><div className="h-24 bg-muted rounded-md"></div></CardContent>
                </Card>
                 <Card className="rounded-xl shadow-sm">
                    <CardHeader><CardTitle className="text-base">Inactive Customers</CardTitle></CardHeader>
                    <CardContent><div className="h-24 bg-muted rounded-md"></div></CardContent>
                </Card>
                 <Card className="rounded-xl shadow-sm">
                    <CardHeader><CardTitle className="text-base">Recruitments</CardTitle></CardHeader>
                    <CardContent><div className="h-24 bg-muted rounded-md"></div></CardContent>
                </Card>
            </div>
             <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <GaugePlaceholder label="Leads Conversion This Month" />
                <GaugePlaceholder label="Leads Conversion This Year" />
            </div>
        </section>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SECTION 3: Loans Overview */}
            <section className="lg:col-span-1">
                 <Card className="h-full rounded-xl shadow-sm">
                    <CardHeader>
                        <CardTitle>Loans Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Disbursed Loans</span>
                            <span className="font-semibold text-foreground">--</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Loans Due Today</span>
                            <span className="font-semibold text-foreground">--</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Month-to-Date Arrears</span>
                            <span className="font-semibold text-foreground">--</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Outstanding Total Loan Arrears</span>
                            <span className="font-semibold text-foreground">--</span>
                        </div>
                    </CardContent>
                </Card>
            </section>

             {/* SECTION 4: Collections Overview */}
            <section className="lg:col-span-2">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Card className="rounded-xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Today’s Collection Rate</CardTitle>
                            <CardDescription>Sub-label placeholder</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Progress value={0} className="h-2 rounded-full" />
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Monthly Collection Rate</CardTitle>
                            <CardDescription>Sub-label placeholder</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Progress value={0} className="h-2 rounded-full" />
                        </CardContent>
                    </Card>
                     <Card className="rounded-xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Tomorrow’s Prepayment Rate</CardTitle>
                            <CardDescription>Sub-label placeholder</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Progress value={0} className="h-2 rounded-full" />
                        </CardContent>
                    </Card>
                     <Card className="rounded-xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">PAR</CardTitle>
                            <CardDescription>Sub-label placeholder</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Progress value={0} className="h-2 rounded-full" />
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>

        {/* SECTION 5: Pending Actions */}
        <section>
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle>Pending Customer Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Placeholder area</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
