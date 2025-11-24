/*
  Warnings:

  - You are about to alter the column `date` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerEmail" TEXT NOT NULL,
    "serviceTitle" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "photoProof" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "clientPhone" TEXT,
    "preferredTime" TEXT,
    "notes" TEXT,
    "address" TEXT,
    CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("address", "amount", "clientEmail", "clientId", "clientPhone", "completedAt", "createdAt", "date", "id", "notes", "paymentIntentId", "paymentStatus", "photoProof", "preferredTime", "providerEmail", "providerId", "serviceId", "serviceTitle", "status") SELECT "address", "amount", "clientEmail", "clientId", "clientPhone", "completedAt", "createdAt", "date", "id", "notes", "paymentIntentId", "paymentStatus", "photoProof", "preferredTime", "providerEmail", "providerId", "serviceId", "serviceTitle", "status" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
