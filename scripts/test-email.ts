import dotenv from "dotenv";
import { sendEmail, emailTemplates } from "../src/emailService";

// Load environment variables
dotenv.config();

const testEmail = async () => {
  console.log("📧 Testing Email Service Integration...");

  try {
    // Send test email using the application's service
    // This will automatically handle the fallback to Ethereal if SMTP is missing
    await sendEmail(
      "test_recipient@example.com",
      "Domy - Test Email Integration",
      emailTemplates.welcome("Test User")
    );

    console.log("✅ Email Service Test Completed.");
    if (!process.env.SMTP_HOST) {
      console.log(
        "ℹ️  Note: If you didn't see a real email, check the Ethereal URL in the output above."
      );
    }
  } catch (error) {
    console.error("❌ Error testing email service:", error);
  }
};

testEmail();
