import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function LoansPage() {
  return (
    <>
      <PageHeader title="Loans" description="View and manage all loans across branches.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Loan
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        <div className="border shadow-sm rounded-lg p-8 text-center text-muted-foreground">
          Loan data table will be displayed here.
        </div>
      </div>
    </>
  );
}
