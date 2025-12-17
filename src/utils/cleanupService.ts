import { prisma } from "../lib/prisma";
import {
  deleteCloudinaryImage,
  getPublicIdFromUrl,
} from "../config/cloudinary";
import logger from "./logger";

/**
 * Cleanup old photo proofs from completed bookings
 * Deletes photos older than specified days to save Cloudinary storage
 */
export async function cleanupOldPhotoProofs(daysOld: number = 7): Promise<{
  processed: number;
  deleted: number;
  errors: number;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  logger.info(`Starting cleanup of photo proofs older than ${daysOld} days`, {
    cutoffDate: cutoffDate.toISOString(),
  });

  // Find completed bookings with photo proofs older than cutoff
  const bookingsWithOldPhotos = await prisma.booking.findMany({
    where: {
      status: "completed",
      photoProof: { not: null },
      completedAt: { lt: cutoffDate },
    },
    select: {
      id: true,
      photoProof: true,
      completedAt: true,
    },
  });

  let deleted = 0;
  let errors = 0;

  for (const booking of bookingsWithOldPhotos) {
    if (!booking.photoProof) continue;

    try {
      // Extract public ID from Cloudinary URL
      const publicId = getPublicIdFromUrl(booking.photoProof);

      if (publicId) {
        // Delete from Cloudinary
        const success = await deleteCloudinaryImage(publicId);

        if (success) {
          // Remove reference from database
          await prisma.booking.update({
            where: { id: booking.id },
            data: { photoProof: null },
          });

          deleted++;
          logger.info(`Deleted photo proof for booking ${booking.id}`);
        } else {
          errors++;
          logger.error(
            `Failed to delete photo from Cloudinary for booking ${booking.id}`
          );
        }
      } else {
        // If not a Cloudinary URL, just clear the DB reference
        await prisma.booking.update({
          where: { id: booking.id },
          data: { photoProof: null },
        });
        deleted++;
      }
    } catch (error: any) {
      errors++;
      logger.error(`Error processing booking ${booking.id}: ${error.message}`);
    }
  }

  const result = {
    processed: bookingsWithOldPhotos.length,
    deleted,
    errors,
  };

  logger.info(`Cleanup completed`, result);

  return result;
}

/**
 * Cleanup orphaned images from Cloudinary
 * (images uploaded but booking was cancelled/failed)
 */
export async function cleanupOrphanedImages(): Promise<void> {
  // This would require listing all images in Cloudinary and comparing with DB
  // For now, we rely on the photo proof cleanup
  logger.info("Orphaned image cleanup not implemented yet");
}
