# Domy - Piattaforma di Prenotazione Servizi di Pulizia

Applicazione web moderna per la prenotazione di servizi di pulizia professionale con sistema di prenotazione intelligente, pagamento escrow, chat in tempo reale e dashboard dedicate.

## 🌟 Funzionalità Principali

### 🔐 Autenticazione & Sicurezza

- **Registrazione & Login**: Accesso separato per Clienti e Fornitori con autenticazione JWT sicura.
- **Verifica Email**: Conferma email obbligatoria con possibilità di reinvio.
- **Protezione Dati**: Password hashate con bcrypt, cookie HTTP-only, e protezione CSRF/XSS.
- **Termini e Condizioni**: Accettazione obbligatoria durante la registrazione.

### 📅 Sistema di Prenotazione Intelligente (NUOVO!)

- **Stima Automatica Durata**: Calcolo intelligente basato su:
  - Metratura appartamento (0-50m², 50-80m², 80-120m², 120+m²)
  - Numero di finestre (0, 1-4, 4-6, 6-10)
- **Prezzo Dinamico**: Calcolo automatico basato su tariffa oraria × durata stimata.
- **Slot Orari**: Visualizzazione solo degli orari disponibili.
- **Prevenzione Sovrapposizioni**: Validazione server-side delle prenotazioni.
- **Calendario Moderno**: Date picker React in italiano con design elegante.

### 👥 Dashboard Utenti

- **Dashboard Cliente**:
  - 📋 Visualizzazione prenotazioni con stato e dettagli.
  - 🔍 Ricerca servizi nella pagina dedicata "Esplora".
  - 💬 Chat in tempo reale con i fornitori.
  - ❌ Cancellazione prenotazioni con rimborso automatico.
- **Dashboard Fornitore**:
  - ➕ Creazione e gestione servizi offerti.
  - 📅 Calendario prenotazioni e gestione disponibilità.
  - ⏰ Configurazione orari di lavoro (inizio/fine giornata).
  - 💬 Chat in tempo reale con i clienti.
  - ✅ Completamento servizi con upload prova fotografica.
- **Dashboard Amministratore**:
  - 🛡️ Gestione completa di utenti, servizi e prenotazioni.
  - 🚫 Moderazione contenuti e risoluzione dispute.

### 💬 Sistema di Chat in Tempo Reale

- **Socket.IO**: Comunicazione istantanea tra cliente e fornitore.
- **Notifiche**: Contatore messaggi non letti in tempo reale.
- **Storico**: Salvataggio conversazioni nel database.

### 💳 Sistema di Pagamento Escrow (Stripe)

- **Sicurezza**: I fondi vengono trattenuti fino al completamento del servizio.
- **Rilascio**: Pagamento sbloccato solo dopo conferma e prova fotografica.
- **Rimborso Automatico**: Gestione automatica rimborsi in caso di cancellazione.

### 🎨 UI/UX Moderna

- **Landing Page Professionale**: Design con gradiente scuro e immagine hero.
- **Icone SVG Minimal**: Stile coerente e professionale (Feather Icons style).
- **Form Prenotazione 3 Step**: Wizard intuitivo per la prenotazione.
- **Responsive Design**: Ottimizzato per desktop e mobile.
- **Notifiche Toast**: Feedback visivo per le azioni utente.

## 🛠️ Stack Tecnologico

- **Frontend**: React 19, Vite, TypeScript, React DatePicker, CSS Modules.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL (Neon) con Prisma ORM.
- **Real-time**: Socket.IO.
- **Pagamenti**: Stripe API.
- **Email**: Resend API.
- **Sicurezza**: Helmet, Rate Limiting, Express Validator, BCrypt.

## 🚀 Installazione e Avvio

### Prerequisiti

- Node.js (v18+)
- npm
- Account PostgreSQL (es. Neon)
- Account Stripe (per pagamenti)
- Account Resend (per email)

### Setup Iniziale

1. **Clona il repository:**

   ```bash
   git clone https://github.com/MassimoMarrone/Copilot_test.git
   cd Copilot_test
   ```

2. **Installa le dipendenze:**

   ```bash
   npm install
   ```

3. **Configura l'ambiente:**
   Copia il file `.env.example` in `.env` e configura le variabili:
   ```env
   DATABASE_URL="postgresql://..."
   JWT_SECRET="your-secret"
   STRIPE_SECRET_KEY="sk_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   RESEND_API_KEY="re_..."
   ```

4. **Inizializza il Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Avvio Applicazione

Per avviare l'intero stack (Backend + Frontend) in modalità sviluppo:

```bash
npm run dev:full
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

### Altri Comandi Utili

- `npm run build`: Compila tutto il progetto per produzione.
- `npm start`: Avvia il server di produzione.
- `npx prisma studio`: Interfaccia grafica per esplorare il database.

## 📊 Stato del Progetto

**Versione Attuale**: v1.1.0

### ✅ Funzionalità Completate

- [x] Autenticazione completa (JWT, Cookie, Verifica Email).
- [x] CRUD Servizi e Prenotazioni.
- [x] **Sistema di prenotazione intelligente** (stima durata, prezzo dinamico).
- [x] **Gestione slot orari** con prevenzione sovrapposizioni.
- [x] Chat in tempo reale (Socket.IO) con notifiche.
- [x] Dashboard Admin completa.
- [x] Upload immagini (Multer).
- [x] Pagamenti Stripe con escrow e rimborsi automatici.
- [x] UI/UX Moderna con icone SVG professionali.
- [x] Calendario React DatePicker in italiano.

### 🚧 Roadmap Futura

- [ ] Sistema di recensioni e rating avanzato.
- [ ] Notifiche push.
- [ ] App mobile (React Native).
- [ ] Dashboard analytics per fornitori.

## 📁 Struttura Progetto

```
├── prisma/                 # Schema e migrazioni database
├── src/                    # Backend (Node.js/Express)
│   ├── controllers/        # Controller API
│   ├── services/           # Logica business
│   ├── routes/             # Route API
│   └── middleware/         # Auth, validation, rate limiting
├── src-react/              # Frontend (React/Vite)
│   ├── components/         # Componenti React
│   ├── pages/              # Pagine principali
│   ├── services/           # API client services
│   └── styles/             # CSS per componenti
└── public/                 # Asset statici
```

## 📄 Licenza

ISC
