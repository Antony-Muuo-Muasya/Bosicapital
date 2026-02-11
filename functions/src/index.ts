
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import cors from "cors";

admin.initializeApp();
const db = admin.firestore();
const corsHandler = cors({origin: true});

// Define interfaces for expected data structures
interface MpesaCallbackData {
    TransactionType: string;
    TransID: string;
    TransTime: string;
    TransAmount: string;
    BusinessShortCode: string;
    BillRefNumber: string;
    MSISDN: string;
    FirstName: string;
    MiddleName?: string;
    LastName?: string;
}

interface Loan {
    id: string;
    organizationId: string;
    borrowerId: string;
    totalPayable: number;
}

interface Installment {
    id: string;
    expectedAmount: number;
    paidAmount: number;
    status: "Paid" | "Unpaid" | "Partial" | "Overdue";
}

/**
 * Normalizes a Kenyan phone number from 254... format to 07... format.
 * @param {string} msisdn The phone number from M-Pesa.
 * @return {string | null} The normalized phone number or null if invalid.
 */
function normalizePhoneNumber(msisdn: string): string | null {
  if (msisdn.startsWith("254") && msisdn.length === 12) {
    return "0" + msisdn.substring(3);
  }
  return null; // Or handle other formats as needed
}

/**
 * Sends an SMS using Africa's Talking API.
 * @param {string} to The recipient's phone number.
 * @param {string} message The message to send.
 */
async function sendSms(to: string, message: string) {
  const username = process.env.AFRICASTALKING_USERNAME!;
  const apikey = process.env.AFRICASTALKING_APIKEY!;

  if (!username || !apikey) {
    functions.logger.error("Africa's Talking credentials are not set in environment variables.");
    return;
  }

  const payload = new URLSearchParams({username, to, message});

  try {
    await axios.post("https://api.africastalking.com/version1/messaging",
      payload.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "apiKey": apikey,
          "Accept": "application/json",
        },
      }
    );
    functions.logger.info(`SMS sent to ${to}`);
  } catch (error) {
    functions.logger.error(`Failed to send SMS to ${to}:`, error);
  }
}

export const mpesaPaymentCallback = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      functions.logger.warn("Received non-POST request");
      res.status(405).send("Method Not Allowed");
      return;
    }

    const callbackData: MpesaCallbackData = req.body;

    // 1. Save every raw callback
    try {
      await db.collection("mpesa_callbacks").add(callbackData);
    } catch (error) {
      functions.logger.error("Failed to save raw callback:", error);
      // We still proceed even if this fails
    }

    const {TransID, BillRefNumber, MSISDN, TransAmount} = callbackData;
    const paymentAmount = parseFloat(TransAmount);

    if (!TransID || isNaN(paymentAmount)) {
      functions.logger.error("Invalid callback data received", callbackData);
      res.status(400).json({ResultCode: 1, ResultDesc: "Invalid data"});
      return;
    }

    try {
      // 2. Handle duplicate callbacks
      const paymentsRef = db.collectionGroup("repayments");
      const existingPayment = await paymentsRef.where("transId", "==", TransID).limit(1).get();
      if (!existingPayment.empty) {
        functions.logger.warn(`Duplicate transaction ID received: ${TransID}`);
        res.status(200).json({ResultCode: 0, ResultDesc: "Accepted"});
        return;
      }

      // 3. Match payment to a customer/loan
      let loanRef: admin.firestore.DocumentReference | null = null;
      let loanData: Loan | null = null;
      let borrowerId: string | null = null;
      let borrowerPhone: string | null = null;

      // Primary match: BillRefNumber as loanId
      if (BillRefNumber) {
        const potentialLoanRef = db.collection("loans").doc(BillRefNumber);
        const loanDoc = await potentialLoanRef.get();
        if (loanDoc.exists) {
          loanRef = potentialLoanRef;
          loanData = loanDoc.data() as Loan;
          borrowerId = loanData.borrowerId;
        }
      }

      // Fallback match: MSISDN as phone number
      if (!loanRef && MSISDN) {
        const normalizedPhone = normalizePhoneNumber(MSISDN);
        if (normalizedPhone) {
          const borrowersQuery = await db.collection("borrowers").where("phone", "==", normalizedPhone).limit(1).get();
          if (!borrowersQuery.empty) {
            const borrower = borrowersQuery.docs[0].data();
            borrowerId = borrowersQuery.docs[0].id;
            borrowerPhone = borrower.phone;

            // Find the most recent active loan for this borrower
            const loansQuery = await db.collection("loans")
              .where("borrowerId", "==", borrowerId)
              .where("status", "==", "Active")
              .orderBy("issueDate", "desc")
              .limit(1).get();
            if (!loansQuery.empty) {
              loanRef = loansQuery.docs[0].ref;
              loanData = loansQuery.docs[0].data() as Loan;
            }
          }
        }
      }

      if (!loanRef || !loanData || !borrowerId) {
        functions.logger.warn("Could not match payment to any loan.", callbackData);
        await db.collection("failed_mpesa_callbacks").add(callbackData);
        res.status(200).json({ResultCode: 0, ResultDesc: "Accepted"});
        return;
      }

      // 4. Process payment within a transaction
      const finalLoanStatus = await db.runTransaction(async (transaction) => {
        const installmentsRef = loanRef.collection("installments");
        const unpaidInstallmentsQuery = await transaction.get(
          installmentsRef.where("status", "in", ["Unpaid", "Partial", "Overdue"]).orderBy("dueDate")
        );

        let paymentRemaining = paymentAmount;
        let totalPaidOnLoan = 0;

        // First pass to calculate total paid so far
        const allInstallments = await transaction.get(installmentsRef);
        allInstallments.forEach((doc) => {
          totalPaidOnLoan += (doc.data() as Installment).paidAmount;
        });

        for (const doc of unpaidInstallmentsQuery.docs) {
          if (paymentRemaining <= 0) break;
          const installment = doc.data() as Installment;
          const amountDue = installment.expectedAmount - installment.paidAmount;

          if (paymentRemaining >= amountDue) {
            transaction.update(doc.ref, {paidAmount: installment.expectedAmount, status: "Paid"});
            paymentRemaining -= amountDue;
          } else {
            transaction.update(doc.ref, {paidAmount: installment.paidAmount + paymentRemaining, status: "Partial"});
            paymentRemaining = 0;
          }
        }

        totalPaidOnLoan += paymentAmount;
        const balanceAfterPayment = loanData.totalPayable - totalPaidOnLoan;
        const newLoanStatus = balanceAfterPayment <= 0 ? "Completed" : "Active";

        // Update main loan doc
        transaction.update(loanRef, {status: newLoanStatus, lastPaymentDate: new Date().toISOString()});

        // Create new repayment record
        const newRepaymentRef = db.collection("repayments").doc();
        transaction.set(newRepaymentRef, {
          id: newRepaymentRef.id,
          organizationId: loanData.organizationId,
          loanId: loanRef.id,
          borrowerId: borrowerId,
          transId: TransID,
          amount: paymentAmount,
          paymentDate: new Date().toISOString(),
          collectedById: "mpesa_system",
          method: "Mobile Money",
          phone: MSISDN,
          balanceAfterPayment: balanceAfterPayment,
        });

        return {newLoanStatus, balanceAfterPayment, loanId: loanRef.id};
      });

      // 5. Trigger SMS Notification (outside the transaction)
      if (borrowerPhone) {
        const {newLoanStatus, balanceAfterPayment, loanId} = finalLoanStatus;
        const smsMessage = `Payment Received: KES ${paymentAmount}.\nLoan ID: ${loanId.substring(0, 8)}...\nRemaining Balance: KES ${balanceAfterPayment.toFixed(2)}.\nStatus: ${newLoanStatus}.\nThank you for your payment.`;
        await sendSms(borrowerPhone, smsMessage);
      }

      res.status(200).json({ResultCode: 0, ResultDesc: "Accepted"});
    } catch (error) {
      functions.logger.error("Critical error in mpesaPaymentCallback:", error, callbackData);
      await db.collection("failed_mpesa_callbacks").add(callbackData);
      // Still tell Safaricom we're okay so they don't retry. We've logged it.
      res.status(200).json({ResultCode: 0, ResultDesc: "Accepted"});
    }
  });
});
