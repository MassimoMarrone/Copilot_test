-- AlterTable Booking - Add columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Booking' AND column_name = 'endTime') THEN
        ALTER TABLE "Booking" ADD COLUMN "endTime" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Booking' AND column_name = 'estimatedDuration') THEN
        ALTER TABLE "Booking" ADD COLUMN "estimatedDuration" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Booking' AND column_name = 'squareMetersRange') THEN
        ALTER TABLE "Booking" ADD COLUMN "squareMetersRange" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Booking' AND column_name = 'startTime') THEN
        ALTER TABLE "Booking" ADD COLUMN "startTime" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Booking' AND column_name = 'windowsCount') THEN
        ALTER TABLE "Booking" ADD COLUMN "windowsCount" INTEGER;
    END IF;
END $$;

-- AlterTable Service - Add columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Service' AND column_name = 'priceType') THEN
        ALTER TABLE "Service" ADD COLUMN "priceType" TEXT NOT NULL DEFAULT 'fixed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Service' AND column_name = 'slotDurationMinutes') THEN
        ALTER TABLE "Service" ADD COLUMN "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Service' AND column_name = 'workingHoursEnd') THEN
        ALTER TABLE "Service" ADD COLUMN "workingHoursEnd" TEXT NOT NULL DEFAULT '18:00';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Service' AND column_name = 'workingHoursStart') THEN
        ALTER TABLE "Service" ADD COLUMN "workingHoursStart" TEXT NOT NULL DEFAULT '08:00';
    END IF;
END $$;
