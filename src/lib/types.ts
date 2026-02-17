
export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  createdAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  roleId: string;
  branchIds: string[];
  status: 'active' | 'suspended';
  createdAt: string;
  avatarUrl?: string;
  marketingOptIn?: boolean;
}

export interface Role {
  id: string;
  organizationId?: string;
  name: string;
  systemRole: boolean;
  permissions: string[];
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  location: string;
  isMain: boolean;
}

export interface Borrower {
  id: string;
  organizationId: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  nationalId: string;
  phone: string;
  email?: string;
  address?: string;
  employmentStatus?: 'Employed' | 'Self-employed' | 'Unemployed';
  monthlyIncome?: number;
  photoUrl?: string;
  businessPhotoUrl?: string;
  homeAssetsPhotoUrl?: string;
  branchId: string;
  userId: string;
  registrationFeeRequired?: boolean;
  registrationFeeAmount?: number;
  registrationFeePaid: boolean;
  registrationFeePaidAt?: string | null;
  registrationPaymentId?: string | null;
}

export interface Loan {
  id: string;
  organizationId: string;
  borrowerId: string;
  loanProductId: string;
  principal: number;
  interestRate: number;
  totalPayable: number;
  installmentAmount: number;
  duration: number;
  issueDate: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Active' | 'Completed' | 'Rejected';
  loanOfficerId: string;
  branchId: string;
  lastPaymentDate?: string;
  approvedById?: string;
}

export interface LoanProduct {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  duration: number; 
  repaymentCycle: 'Weekly' | 'Monthly';
  processingFee?: number;
}

export interface Installment {
  id: string;
  loanId: string;
  borrowerId: string;
  loanOfficerId: string;
  organizationId: string;
  branchId: string;
  installmentNumber: number;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  status: 'Paid' | 'Unpaid' | 'Partial' | 'Overdue';
}

export interface Repayment {
  id: string;
  organizationId: string;
  loanId: string;
  loanOfficerId: string;
  borrowerId: string;
  transId: string;
  amount: number;
  paymentDate: string;
  collectedById: string;
  method: 'Cash' | 'Bank Transfer' | 'Mobile Money';
  phone?: string;
  balanceAfterPayment?: number;
}

export interface RegistrationPayment {
  id: string;
  organizationId: string;
  borrowerId: string;
  amount: number;
  currency?: 'KES';
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Money';
  reference: string;
  collectedBy: string;
  createdAt: string;
  status?: 'confirmed';
}

export interface Interaction {
    id: string;
    borrowerId: string;
    organizationId: string;
    branchId: string;
    recordedById: string;
    recordedByName: string;
    timestamp: string;
    notes: string;
}

export interface Target {
    id: string;
    organizationId: string;
    branchId: string;
    userId?: string;
    name: string;
    type: 'disbursal_amount' | 'new_borrowers' | 'collection_rate' | 'portfolio_value';
    value: number;
    startDate: string;
    endDate: string;
}
