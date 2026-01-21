'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Borrower } from '@/lib/types';
import { BorrowersDataTable } from '@/components/borrowers/borrowers-data-table';
import { getBorrowerColumns } from '@/components/borrowers/columns';
import { AddBorrowerDialog } from '@/components/borrowers/add-borrower-dialog';
import { PayRegistrationFeeDialog } from '@/components/borrowers/pay-registration-fee-dialog';
import { useState, useMemo } from 'react';

export default function BorrowersPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);

  const borrowersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'borrowers');
  }, [firestore, user]);

  const { data: borrowers, isLoading } = useCollection<Borrower>(borrowersQuery);

  const handleRecordPayment = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setIsPaymentDialogOpen(true);
  };

  const columns = useMemo(() => getBorrowerColumns(handleRecordPayment), []);

  return (
    <>
      <PageHeader title="Borrowers" description="Manage your list of borrowers.">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Borrower
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        {isLoading && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">Loading borrowers...</div>}
        {borrowers && <BorrowersDataTable columns={columns} data={borrowers} />}
        {!isLoading && !borrowers && <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">No borrowers found.</div>}
      </div>
      <AddBorrowerDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      {selectedBorrower && (
        <PayRegistrationFeeDialog 
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            borrower={selectedBorrower}
        />
      )}
    </>
  );
}
