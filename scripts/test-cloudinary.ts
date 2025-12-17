// Test Cloudinary upload
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ".env.development" });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
  console.log("🔧 Cloudinary Config:");
  console.log("  Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
  console.log(
    "  API Key:",
    process.env.CLOUDINARY_API_KEY?.substring(0, 8) + "..."
  );
  console.log("");

  const testImagePath = path.join(
    __dirname,
    "..",
    "public",
    "assets",
    "cleaning.jpg"
  );

  console.log("📤 Uploading test image...");
  console.log("  File:", testImagePath);
  console.log("");

  try {
    const result = await cloudinary.uploader.upload(testImagePath, {
      folder: "domy/test",
      transformation: [
        { width: 400, height: 300, crop: "limit", quality: "auto" },
      ],
    });

    console.log("✅ Upload SUCCESS!");
    console.log("");
    console.log("📋 Result:");
    console.log("  Public ID:", result.public_id);
    console.log("  URL:", result.secure_url);
    console.log("  Format:", result.format);
    console.log("  Size:", Math.round(result.bytes / 1024), "KB");
    console.log("  Dimensions:", result.width, "x", result.height);
    console.log("");
    console.log("🔗 Apri nel browser:", result.secure_url);

    // Cleanup - delete test image
    console.log("");
    console.log("🗑️ Cleaning up test image...");
    await cloudinary.uploader.destroy(result.public_id);
    console.log("✅ Test image deleted from Cloudinary");
  } catch (error: any) {
    console.error("❌ Upload FAILED!");
    console.error("  Error:", error.message);
    if (error.http_code) {
      console.error("  HTTP Code:", error.http_code);
    }
  }
}

testUpload();
