-- CreateTable
CREATE TABLE "MpesaCallback" (
    "id" TEXT NOT NULL,
    "transactionType" TEXT,
    "transId" TEXT,
    "transTime" TEXT,
    "transAmount" TEXT,
    "businessShortCode" TEXT,
    "billRefNumber" TEXT,
    "msisdn" TEXT,
    "firstName" TEXT,
    "middleName" TEXT,
    "lastName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Processed',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MpesaCallback_pkey" PRIMARY KEY ("id")
);
