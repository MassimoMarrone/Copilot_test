import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { sendEmail, emailTemplates } from "../src/emailService";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

const resendLastEmail = async () => {
  try {
    // Get last booking
    const lastBooking = await prisma.booking.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!lastBooking) {
      console.log("❌ No bookings found.");
      return;
    }

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
  } finally {
    await prisma.$disconnect();
  }
};

resendLastEmail();
