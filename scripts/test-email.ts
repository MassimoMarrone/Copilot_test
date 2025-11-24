import dotenv from "dotenv";
import nodemailer from "nodemailer";

// Load environment variables
dotenv.config();

const testEmail = async () => {
  console.log("📧 Testing Email Configuration...");
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   User: ${process.env.SMTP_USER}`);

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.error("❌ Missing SMTP configuration in .env");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    // Verify connection configuration
    await transporter.verify();
    console.log("✅ SMTP Connection Verified Successfully!");

    // Send test email
    const info = await transporter.sendMail({
      from: `"Domy Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to self
      subject: "Domy - Test Email Configuration",
      text: "If you receive this email, your SMTP configuration is working correctly! 🚀",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #28a745;">Configurazione Email Riuscita! 🎉</h2>
          <p>Ciao,</p>
          <p>Se stai leggendo questa email, significa che il sistema di notifiche di <strong>Domy</strong> è configurato correttamente.</p>
          <p>Le notifiche verranno inviate per:</p>
          <ul>
            <li>Nuove registrazioni</li>
            <li>Prenotazioni confermate</li>
            <li>Cancellazioni</li>
            <li>Recensioni</li>
          </ul>
          <br>
          <p>Buon lavoro!</p>
        </div>
      `,
    });

    console.log(`✅ Test Email Sent! Message ID: ${info.messageId}`);
    console.log(`   Check your inbox at: ${process.env.SMTP_USER}`);
  } catch (error) {
    console.error("❌ Error sending test email:", error);
  }
};

testEmail();
