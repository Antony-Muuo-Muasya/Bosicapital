import type { User, Borrower, Loan, Installment, LoanProduct } from '@/lib/types';

export const loanProducts: LoanProduct[] = [
  { id: 'prod-1', name: 'Motorcycle Loan', category: 'Asset Finance', minAmount: 500, maxAmount: 3000, interestRate: 15, duration: 24, repaymentCycle: 'Monthly' },
  { id: 'prod-2', name: 'Small Business Boost', category: 'Business', minAmount: 1000, maxAmount: 10000, interestRate: 12, duration: 36, repaymentCycle: 'Monthly' },
  { id: 'prod-3', name: 'School Fees Support', category: 'Education', minAmount: 200, maxAmount: 1500, interestRate: 10, duration: 12, repaymentCycle: 'Monthly' },
];

export const borrowers: Borrower[] = [
  { id: 'b-1', fullName: 'Jane Smith', dateOfBirth: '1990-05-15', gender: 'Female', nationalId: '123456789', phone: '555-0101', email: 'jane.s@email.com', address: '123 Main St, Anytown', employmentStatus: 'Employed', monthlyIncome: 2500, photoUrl: 'https://picsum.photos/seed/b-1/400/400', branchId: 'branch-1' },
  { id: 'b-2', fullName: 'John Doe', dateOfBirth: '1985-09-20', gender: 'Male', nationalId: '987654321', phone: '555-0102', email: 'john.d@email.com', address: '456 Oak Ave, Anytown', employmentStatus: 'Self-employed', monthlyIncome: 4000, photoUrl: 'https://picsum.photos/seed/b-2/400/400', branchId: 'branch-1' },
  { id: 'b-3', fullName: 'Emily White', dateOfBirth: '1992-02-10', gender: 'Female', nationalId: 'A55B66C77', phone: '555-0103', email: 'emily.w@email.com', address: '789 Pine Ln, Anytown', employmentStatus: 'Employed', monthlyIncome: 3200, photoUrl: 'https://picsum.photos/seed/b-3/400/400', branchId: 'branch-2' },
];

export const loans: Loan[] = [
  { id: 'loan-1', borrowerId: 'b-1', loanProductId: 'prod-1', principal: 1500, interestRate: 15, totalPayable: 1725, installmentAmount: 71.88, duration: 24, issueDate: '2023-11-01', status: 'Active', loanOfficerId: 'user-2', branchId: 'branch-1' },
  { id: 'loan-2', borrowerId: 'b-2', loanProductId: 'prod-2', principal: 5000, interestRate: 12, totalPayable: 6500, installmentAmount: 180.56, duration: 36, issueDate: '2024-01-10', status: 'Active', loanOfficerId: 'user-2', branchId: 'branch-1' },
  { id: 'loan-3', borrowerId: 'b-3', loanProductId: 'prod-3', principal: 1000, interestRate: 10, totalPayable: 1100, installmentAmount: 91.67, duration: 12, issueDate: '2023-08-15', status: 'Completed', loanOfficerId: 'user-3', branchId: 'branch-2' },
  { id: 'loan-4', borrowerId: 'b-1', loanProductId: 'prod-3', principal: 500, interestRate: 10, totalPayable: 550, installmentAmount: 45.83, duration: 12, issueDate: '2024-03-20', status: 'Pending Approval', loanOfficerId: 'user-2', branchId: 'branch-1' },
];

export const installments: Installment[] = [
  // Loan 1
  { id: 'inst-1-1', loanId: 'loan-1', installmentNumber: 8, dueDate: '2024-07-01', expectedAmount: 71.88, paidAmount: 0, status: 'Overdue' },
  { id: 'inst-1-2', loanId: 'loan-1', installmentNumber: 9, dueDate: '2024-08-01', expectedAmount: 71.88, paidAmount: 0, status: 'Unpaid' },
  // Loan 2
  { id: 'inst-2-1', loanId: 'loan-2', installmentNumber: 6, dueDate: '2024-07-10', expectedAmount: 180.56, paidAmount: 100, status: 'Partial' },
  { id: 'inst-2-2', loanId: 'loan-2', installmentNumber: 7, dueDate: '2024-08-10', expectedAmount: 180.56, paidAmount: 0, status: 'Unpaid' },
];

export const dueDateAiExample = {
    repaymentHistory: `Borrower ID B-1 (Jane Smith): Loan L-1 active since 2023-11-01. Payments for first 6 months were on time. 7th payment was 15 days late. 8th payment is currently 5 days overdue.
Borrower ID B-2 (John Doe): Loan L-2 active since 2024-01-10. All payments made on time, sometimes early. Last payment was partial, citing a supplier delay.
Borrower ID B-4 (New Client): No history available.`,
    externalEvents: `Local news reports heavy flooding in the North District, where Jane Smith resides.
National economic news indicates a 5% increase in fuel prices, affecting transport and logistics for small businesses like John Doe's.`,
    upcomingSchedule: `L-1 (Jane Smith): Installment 9 due Aug 1, 2024 for $71.88.
L-2 (John Doe): Remainder of Installment 6 ($80.56) due immediately, Installment 7 ($180.56) due Aug 10, 2024.`,
    overdueSchedule: `L-1 (Jane Smith): Installment 8 ($71.88) is currently 5 days overdue.`,
    currentSchedule: `All other active loans in the branch are current with no outstanding issues.`,
}
