-- Add service start timestamp to Booking

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
