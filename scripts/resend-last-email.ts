import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { sendEmail, emailTemplates } from "../src/emailService";

// Load environment variables
dotenv.config();

const bookingsPath = path.join(__dirname, "../data/bookings.json");

const resendLastEmail = async () => {
  try {
    // Read bookings
    const bookingsData = fs.readFileSync(bookingsPath, "utf-8");
    const bookings = JSON.parse(bookingsData);

    if (bookings.length === 0) {
      console.log("❌ No bookings found.");
      return;
    }

    // Get last booking
    const lastBooking = bookings[bookings.length - 1];
    console.log(`Found last booking: ${lastBooking.id}`);
    console.log(`Client: ${lastBooking.clientEmail}`);
    console.log(`Provider: ${lastBooking.providerEmail}`);
    console.log(`Service: ${lastBooking.serviceTitle}`);

    // Send email to client
    console.log("📧 Sending email to client...");
    await sendEmail(
      lastBooking.clientEmail,
      "Prenotazione Confermata (Resend)",
      emailTemplates.newBookingClient(
        lastBooking.clientEmail.split("@")[0],
        lastBooking.serviceTitle,
        new Date(lastBooking.date).toLocaleDateString("it-IT")
      )
    );

    // Send email to provider
    console.log("📧 Sending email to provider...");
    await sendEmail(
      lastBooking.providerEmail,
      "Nuova Prenotazione Ricevuta (Resend)",
      emailTemplates.newBookingProvider(
        lastBooking.providerEmail.split("@")[0],
        lastBooking.clientEmail.split("@")[0],
        lastBooking.serviceTitle,
        new Date(lastBooking.date).toLocaleDateString("it-IT")
      )
    );

    console.log("✅ Emails resent successfully!");
  } catch (error) {
    console.error("❌ Error resending emails:", error);
  }
};

resendLastEmail();
