export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Branch Manager' | 'Loan Officer' | 'Auditor';
  avatarUrl?: string;
};

export type Branch = {
  id: string;
  name: string;
  location: string;
};

export type Borrower = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  employmentStatus: 'Employed' | 'Self-employed' | 'Unemployed';
  monthlyIncome: number;
  photoUrl: string;
  branchId: string;
};

export type LoanProduct = {
  id: string;
  name: string;
  category: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  duration: number; // in months
  repaymentCycle: 'Weekly' | 'Monthly';
};

export type Loan = {
  id: string;
  borrowerId: string;
  loanProductId: string;
  principal: number;
  interestRate: number;
  totalPayable: number;
  installmentAmount: number;
  duration: number; // in months
  issueDate: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Active' | 'Completed' | 'Rejected';
  loanOfficerId: string;
  branchId: string;
};

export type Installment = {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  status: 'Paid' | 'Unpaid' | 'Partial' | 'Overdue';
};

export type Repayment = {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  collectedById: string;
  method: 'Cash' | 'Bank Transfer' | 'Mobile Money';
};
