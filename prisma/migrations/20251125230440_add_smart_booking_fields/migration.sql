-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "estimatedDuration" INTEGER,
ADD COLUMN     "squareMetersRange" TEXT,
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "windowsCount" INTEGER;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "priceType" TEXT NOT NULL DEFAULT 'fixed',
ADD COLUMN     "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "workingHoursEnd" TEXT NOT NULL DEFAULT '18:00',
ADD COLUMN     "workingHoursStart" TEXT NOT NULL DEFAULT '08:00';
