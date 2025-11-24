import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Request } from "express";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "5242880", 10); // 5MB default
const ALLOWED_FILE_TYPES = (
  process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/jpg,image/png,image/gif"
).split(",");

// Configure multer for photo uploads with security checks
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "photo-" + uniqueSuffix + ext);
  },
});

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

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
});
