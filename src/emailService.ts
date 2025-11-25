import nodemailer from "nodemailer";

// Create a transporter using Ethereal (fake SMTP service) for development
// In production, you would use a real service like SendGrid, Mailgun, or Gmail
let transporter: nodemailer.Transporter;

const initEmailService = async () => {
  // Check if SMTP configuration is provided in environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Configure real SMTP
    // Remove spaces from password if present (common copy-paste issue with Google App Passwords)
    const pass = process.env.SMTP_PASS.replace(/\s+/g, "");

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure:
        process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: pass,
      },
      // Force IPv4 to avoid timeouts with IPv6 on some cloud providers
      family: 4,
    } as any);
    console.log("📧 Email Service Initialized (SMTP)");
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
  } else if (process.env.NODE_ENV !== "production") {
    // Use Ethereal for development if no SMTP config provided
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log("📧 Email Service Initialized (Ethereal - Mock)");
    console.log(`   User: ${testAccount.user}`);
    console.log(`   Pass: ${testAccount.pass}`);
  } else {
    console.warn(
      "⚠️ Email service not initialized: Missing SMTP configuration in production."
    );
  }
};

// Initialize the service
// initEmailService().catch(console.error);

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  if (!transporter) {
    await initEmailService();
  }

  try {
    const info = await transporter.sendMail({
      from: '"Domy Platform" <noreply@domy.com>',
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent: ${info.messageId}`);
    // Preview only available when using Ethereal
    if (process.env.NODE_ENV !== "production") {
      console.log(`   Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};

// Email Templates
export const emailTemplates = {
  welcome: (name: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #007bff;">Benvenuto in Domy!</h1>
      <p>Ciao ${name},</p>
      <p>Grazie per esserti registrato alla nostra piattaforma. Siamo felici di averti con noi!</p>
      <p>Inizia subito a cercare servizi o offri le tue competenze.</p>
      <br>
      <p>Il team di Domy</p>
    </div>
  `,
  verification: (name: string, link: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #007bff;">Verifica la tua email</h1>
      <p>Ciao ${name},</p>
      <p>Grazie per esserti registrato a Domy. Per completare la registrazione, clicca sul link qui sotto:</p>
      <p style="text-align: center;">
        <a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Verifica Email</a>
      </p>
      <p>Oppure copia e incolla questo link nel tuo browser:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Il link scadrà tra 24 ore.</p>
      <br>
      <p>Il team di Domy</p>
    </div>
  `,
  newBookingProvider: (
    providerName: string,
    clientName: string,
    serviceTitle: string,
    date: string
  ) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Nuova Prenotazione!</h2>
      <p>Ciao ${providerName},</p>
      <p>Hai ricevuto una nuova richiesta di prenotazione da <strong>${clientName}</strong>.</p>
      <p><strong>Servizio:</strong> ${serviceTitle}</p>
      <p><strong>Data:</strong> ${date}</p>
      <p>Accedi alla tua dashboard per gestire la prenotazione.</p>
    </div>
  `,
  newBookingClient: (
    clientName: string,
    serviceTitle: string,
    date: string
  ) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #007bff;">Prenotazione Confermata</h2>
      <p>Ciao ${clientName},</p>
      <p>La tua richiesta per <strong>${serviceTitle}</strong> è stata inviata.</p>
      <p><strong>Data:</strong> ${date}</p>
      <p>Riceverai una notifica quando il fornitore accetterà o completerà il servizio.</p>
    </div>
  `,
  bookingCancelled: (
    userName: string,
    serviceTitle: string,
    reason: string = "Nessun motivo specificato"
  ) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">Prenotazione Cancellata</h2>
      <p>Ciao ${userName},</p>
      <p>La prenotazione per il servizio <strong>${serviceTitle}</strong> è stata cancellata.</p>
      <p><strong>Motivo:</strong> ${reason}</p>
      <p>Se hai già effettuato il pagamento, verrà rimborsato secondo i termini di servizio.</p>
    </div>
  `,
  bookingCompleted: (clientName: string, serviceTitle: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Servizio Completato!</h2>
      <p>Ciao ${clientName},</p>
      <p>Il servizio <strong>${serviceTitle}</strong> è stato segnato come completato dal fornitore.</p>
      <p>Per favore, accedi alla piattaforma per lasciare una recensione.</p>
      <a href="http://localhost:3000/bookings" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Lascia una Recensione</a>
    </div>
  `,
};
