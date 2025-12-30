/*
  Purpose:
  - Restore Booking escrow/dispute columns and ConsentRecord table that were previously dropped by a db push.
  - This migration is additive (no DROP), to avoid further data loss.
*/

-- Restore Booking columns (escrow confirmation + disputes + proofs)
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "awaitingClientConfirmation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "clientConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "clientProducts" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmationDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "disputeNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "disputeOpenedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "disputeReason" TEXT,
  ADD COLUMN IF NOT EXISTS "disputeResolvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "disputeResolvedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "disputeStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentAuthorizedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "photoProofs" TEXT;

-- ConsentRecord table
CREATE TABLE IF NOT EXISTS "ConsentRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "consentType" TEXT NOT NULL,
  "documentVersion" TEXT NOT NULL,
  "documentHash" TEXT,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "acceptanceMethod" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMP(3),
  "revokedReason" TEXT,

  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- Indexes used by schema
CREATE INDEX IF NOT EXISTS "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");
CREATE INDEX IF NOT EXISTS "ConsentRecord_consentType_idx" ON "ConsentRecord"("consentType");

CREATE INDEX IF NOT EXISTS "ChatMessage_bookingId_createdAt_idx" ON "ChatMessage"("bookingId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_senderId_read_idx" ON "ChatMessage"("senderId", "read");

CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE INDEX IF NOT EXISTS "Review_serviceId_idx" ON "Review"("serviceId");
CREATE INDEX IF NOT EXISTS "Review_providerId_idx" ON "Review"("providerId");
CREATE INDEX IF NOT EXISTS "Review_clientId_idx" ON "Review"("clientId");

CREATE INDEX IF NOT EXISTS "Service_providerId_idx" ON "Service"("providerId");
CREATE INDEX IF NOT EXISTS "Service_category_idx" ON "Service"("category");

CREATE INDEX IF NOT EXISTS "User_userType_isBlocked_idx" ON "User"("userType", "isBlocked");
CREATE INDEX IF NOT EXISTS "User_isProvider_onboardingStatus_idx" ON "User"("isProvider", "onboardingStatus");

-- Foreign key (add only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ConsentRecord_userId_fkey'
  ) THEN
    ALTER TABLE "ConsentRecord"
      ADD CONSTRAINT "ConsentRecord_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
