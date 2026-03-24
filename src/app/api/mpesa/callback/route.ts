export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

interface MpesaCallbackData {
  TransactionType?: string;
  TransID?: string;
  TransTime?: string;
  TransAmount?: string;
  BusinessShortCode?: string;
  BillRefNumber?: string;
  MSISDN?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

function normalizePhoneNumber(msisdn: string): string | null {
  if (msisdn.startsWith("254") && msisdn.length === 12) {
    return "0" + msisdn.substring(3);
  }
  return null;
}

async function sendSms(to: string, message: string): Promise<void> {
  const username = process.env.AFRICAS_TALKING_USERNAME;
  const apikey = process.env.AFRICAS_TALKING_APIKEY;

  if (!username || !apikey) {
    console.error("Africa's Talking credentials are missing in env");
    return;
  }

  const payload = new URLSearchParams({ username, to, message });

  try {
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": apikey,
        "Accept": "application/json",
      },
      body: payload.toString(),
    });
    
    if (!response.ok) {
        console.error(`Failed to send SMS to ${to}: ${response.statusText}`);
    } else {
        console.log(`SMS sent to ${to}`);
    }
  } catch (error) {
    console.error(`Failed to send SMS to ${to}:`, error);
  }
}

export async function POST(req: Request) {
  try {
    const callbackData: MpesaCallbackData = await req.json();

    const { TransID, BillRefNumber, MSISDN, TransAmount } = callbackData;
    const paymentAmount = parseFloat(TransAmount || "0");

    let status = "Processed";
    let errorMessage = null;

    if (!TransID || isNaN(paymentAmount)) {
      await prisma.mpesaCallback.create({
        data: {
          ...callbackData,
          status: "Failed",
          errorMessage: "Invalid TransID or TransAmount",
        }
      });
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid data" }, { status: 400 });
    }

    try {
      const existingPayment = await prisma.repayment.findFirst({
        where: { transId: TransID }
      });

      if (existingPayment) {
        // Already processed
        await prisma.mpesaCallback.create({
            data: {
              ...callbackData,
              status: "Processed",
              errorMessage: "Duplicate transaction",
            }
        });
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      let loan = null;
      let borrower = null;

      // Match by BillRefNumber as loanId
      if (BillRefNumber) {
        loan = await prisma.loan.findUnique({
          where: { id: BillRefNumber },
          include: { borrower: true }
        });
        if (loan) borrower = loan.borrower;
      }

      // Match by BillRefNumber as National ID if no loanId match
      if (!loan && BillRefNumber) {
        borrower = await prisma.borrower.findFirst({
          where: { nationalId: BillRefNumber }
        });
        if (borrower) {
          loan = await prisma.loan.findFirst({
            where: { borrowerId: borrower.id, status: "Active" },
            orderBy: { issueDate: 'desc' }
          });
        }
      }

      // Match by MSISDN if no BillRefNumber match
      if (!loan && MSISDN) {
        const normalizedPhone = normalizePhoneNumber(MSISDN);
        if (normalizedPhone) {
          borrower = await prisma.borrower.findFirst({
            where: { phone: normalizedPhone }
          });

          if (borrower) {
            loan = await prisma.loan.findFirst({
              where: { borrowerId: borrower.id, status: "Active" },
              orderBy: { issueDate: 'desc' }
            });
          }
        }
      }

      if (loan && borrower) {
        const finalLoanStatus = await prisma.$transaction(async (tx) => {
          const unpaidInstallmentsQuery = await tx.installment.findMany({
            where: {
              loanId: loan!.id,
              status: { in: ["Unpaid", "Partial", "Overdue"] }
            },
            orderBy: { dueDate: 'asc' }
          });

          let paymentRemaining = paymentAmount;
          let totalPaidOnLoan = 0;

          const allInstallments = await tx.installment.findMany({
            where: { loanId: loan!.id }
          });

          allInstallments.forEach((inst) => {
            totalPaidOnLoan += inst.paidAmount;
          });

          for (const inst of unpaidInstallmentsQuery) {
            if (paymentRemaining <= 0) break;
            const amountDue = inst.expectedAmount - inst.paidAmount;

            if (paymentRemaining >= amountDue) {
              await tx.installment.update({
                where: { id: inst.id },
                data: { paidAmount: inst.expectedAmount, status: "Paid" }
              });
              paymentRemaining -= amountDue;
            } else {
              await tx.installment.update({
                where: { id: inst.id },
                data: { paidAmount: inst.paidAmount + paymentRemaining, status: "Partial" }
              });
              paymentRemaining = 0;
            }
          }

          totalPaidOnLoan += paymentAmount;
          const balanceAfterPayment = loan!.totalPayable - totalPaidOnLoan;
          const newLoanStatus = balanceAfterPayment <= 0 ? "Completed" : "Active";

          await tx.loan.update({
            where: { id: loan!.id },
            data: { status: newLoanStatus, lastPaymentDate: new Date().toISOString() }
          });

          const newRepayment = await tx.repayment.create({
            data: {
              organizationId: loan!.organizationId,
              loanId: loan!.id,
              loanOfficerId: loan!.loanOfficerId,
              borrowerId: borrower!.id,
              transId: TransID,
              amount: paymentAmount,
              paymentDate: new Date().toISOString(),
              collectedById: "mpesa_system",
              method: "Mobile Money",
              phone: MSISDN,
              balanceAfterPayment,
            }
          });

          return { newLoanStatus, balanceAfterPayment, loanId: loan!.id };
        });

        if (borrower.phone) {
          const { newLoanStatus, balanceAfterPayment, loanId } = finalLoanStatus;
          const smsMessage = `Payment Received: KES ${paymentAmount}.\nLoan ID: ${loanId.substring(0, 8)}...\nRemaining Balance: KES ${balanceAfterPayment.toFixed(2)}.\nStatus: ${newLoanStatus}.\nThank you for your payment. Bosi Capital.`;
          await sendSms(borrower.phone, smsMessage);
        }
      } else {
        status = "Failed";
        errorMessage = "Could not match to a borrower or active loan";
      }

      await prisma.mpesaCallback.create({
        data: {
          ...callbackData,
          status,
          errorMessage,
        }
      });

      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error: any) {
      console.error("Critical error in mpesaPaymentCallback:", error);
      
      await prisma.mpesaCallback.create({
        data: {
          ...callbackData,
          status: "Failed",
          errorMessage: error.message || "Internal server error during processing",
        }
      });

      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  } catch (e: any) {
    console.error("M-Pesa Webhook Error:", e);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Server Error" }, { status: 500 });
  }
}
