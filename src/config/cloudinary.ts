import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "5242880", 10); // 5MB default
const ALLOWED_FILE_TYPES = (
  process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/jpg,image/png,image/gif"
).split(",");

// File filter for security
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG and GIF are allowed."));
  }
};

// Storage for service images
const serviceStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "domy/services",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [
      { width: 800, height: 600, crop: "limit", quality: "auto" },
    ],
  } as any,
});

// Storage for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "domy/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [
      {
        width: 300,
        height: 300,
        crop: "fill",
        gravity: "face",
        quality: "auto",
      },
    ],
  } as any,
});

// Storage for ID documents (more secure, original quality)
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "domy/documents",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    resource_type: "auto",
    transformation: [{ quality: "auto:best" }],
  } as any,
});

// Storage for booking proof photos
const proofStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "domy/proofs",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [
      { width: 1200, height: 900, crop: "limit", quality: "auto" },
    ],
  } as any,
});

// Export multer instances
export const uploadService = multer({
  storage: serviceStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter,
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter,
});

export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for documents
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG and PDF are allowed for documents."
        )
      );
    }
  },
});

export const uploadProof = multer({
  storage: proofStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter,
});

// Helper to delete image from Cloudinary
export const deleteCloudinaryImage = async (
  publicId: string
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return false;
  }
};

// Helper to get public ID from Cloudinary URL
export const getPublicIdFromUrl = (url: string): string | null => {
  try {
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{filename}
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return matches ? matches[1] : null;
  } catch {
    return null;
  }
};

// Export cloudinary instance for advanced operations
export { cloudinary };
