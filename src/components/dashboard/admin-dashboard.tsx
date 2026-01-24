'use client';
import { PageHeader } from '@/components/page-header';
import { Button } from '../ui/button';
import { PlusCircle, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AddLoanProductDialog } from '../settings/add-loan-product-dialog';
import { useRouter } from 'next/navigation';

export function AdminDashboard() {
  const router = useRouter();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Organization-wide overview of all lending activities."
      >
        <div className='flex gap-2'>
            <Button variant="outline" onClick={() => router.push('/users')}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff
            </Button>
            <Button onClick={() => setIsAddProductOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Loan Product
            </Button>
        </div>
      </PageHeader>
      <div className="p-4 md:p-6 grid gap-6">
         <div className="border shadow-sm rounded-lg p-8 mt-4 text-center text-muted-foreground">
          Dashboard widgets for portfolio overview will be built here.
        </div>
      </div>
      <AddLoanProductDialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen} />
    </>
  );
}
