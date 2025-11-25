import axios from "axios";

// Create a transporter using Ethereal (fake SMTP service) for development
// In production, you would use a real service like SendGrid, Mailgun, or Gmail

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.MAIL_FROM;
  const senderName = process.env.MAIL_FROM_NAME || "Domy Platform";

  if (!apiKey || !senderEmail) {
    console.error("❌ Brevo API key o mittente non configurati.");
    return;
  }

  const data = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      data,
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("📧 Email inviata via Brevo API:", response.data);
  } catch (error: any) {
    console.error(
      "❌ Errore invio email via Brevo API:",
      error.response?.data || error.message
    );
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
