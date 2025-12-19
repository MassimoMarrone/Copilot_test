/*
  Warnings:

  - Adding indexes can take time on large tables.
*/

-- CreateIndex
CREATE INDEX "Booking_providerId_date_idx" ON "Booking"("providerId", "date");

-- CreateIndex
CREATE INDEX "Booking_clientId_date_idx" ON "Booking"("clientId", "date");
