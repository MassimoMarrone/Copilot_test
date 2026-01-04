-- Add provider acceptance fields to Booking

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acceptanceDeadline" TIMESTAMP(3);
