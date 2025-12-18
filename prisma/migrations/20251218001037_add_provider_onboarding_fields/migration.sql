-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "selectedExtras" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "coverageRadiusKm" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "extraServices" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminLevel" TEXT,
ADD COLUMN     "bankAccountHolder" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "fiscalCode" TEXT,
ADD COLUMN     "hasOwnEquipment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "idDocumentBackUrl" TEXT,
ADD COLUMN     "idDocumentExpiry" TIMESTAMP(3),
ADD COLUMN     "idDocumentFrontUrl" TEXT,
ADD COLUMN     "idDocumentNumber" TEXT,
ADD COLUMN     "idDocumentType" TEXT,
ADD COLUMN     "insuranceExpiry" TIMESTAMP(3),
ADD COLUMN     "insuranceNumber" TEXT,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingRejectedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingRejectionReason" TEXT,
ADD COLUMN     "onboardingStatus" TEXT,
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vatNumber" TEXT,
ADD COLUMN     "workingZones" TEXT,
ADD COLUMN     "yearsOfExperience" INTEGER;
