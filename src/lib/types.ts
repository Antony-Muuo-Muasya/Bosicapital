export type Permission = 
  | 'user.create'
  | 'user.edit'
  | 'user.delete'
  | 'user.view'
  | 'role.manage'
  | 'branch.manage'
  | 'loan.create'
  | 'loan.approve'
  | 'loan.view'
  | 'repayment.create'
  | 'reports.view'
  | 'borrower.view.own';

export type Role = {
  id: 'admin' | 'manager' | 'loan_officer' | 'user';
  organizationId: string;
  name: string;
  systemRole: boolean;
  permissions: Permission[];
}

export type User = {
  id: string; // matches auth uid
  organizationId: string;
  fullName: string;
  email: string;
  roleId: Role['id'];
  branchIds: string[];
  status: 'active' | 'suspended';
  createdAt: string; // ISO string
  avatarUrl?: string;
  marketingOptIn?: boolean;
};

export type Branch = {
  id: string;
  organizationId: string;
  name: string;
  location: string;
  isMain: boolean;
};

export type Borrower = {
  id: string;
  organizationId: string;
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
  registrationFeeRequired: boolean;
  registrationFeeAmount: number;
  registrationFeePaid: boolean;
  registrationFeePaidAt: string | null;
  registrationPaymentId: string | null;
  userId: string; // This MUST link to a User with the 'user' role
};

export type LoanProduct = {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  duration: number; // in intervals (e.g., months or weeks, depending on repaymentCycle)
  repaymentCycle: 'Weekly' | 'Monthly';
};

export type Loan = {
  id: string;
  organizationId: string;
  borrowerId: string;
  loanProductId: string;
  principal: number;
  interestRate: number;
  totalPayable: number;
  installmentAmount: number;
  duration: number; // Corresponds to LoanProduct's duration intervals
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
  id:string;
  loanId: string;
  amount: number;
  paymentDate: string;
  collectedById: string;
  method: 'Cash' | 'Bank Transfer' | 'Mobile Money';
};

export type RegistrationPayment = {
    id: string;
    organizationId: string;
    borrowerId: string;
    amount: number;
    currency: string;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Money';
    reference: string;
    collectedBy: string;
    createdAt: string;
    status: 'confirmed';
};
