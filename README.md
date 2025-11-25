# Domy - Piattaforma di Prenotazione Servizi di Pulizia

Applicazione web moderna per la prenotazione di servizi di pulizia con sistema di pagamento escrow, chat in tempo reale e dashboard dedicate.

## Funzionalità Principali

### 🔐 Autenticazione & Sicurezza

- **Registrazione & Login**: Accesso separato per Clienti e Fornitori con autenticazione JWT sicura.
- **Protezione Dati**: Password hashate con bcrypt, cookie HTTP-only, e protezione CSRF/XSS.
- **Termini e Condizioni**: Accettazione obbligatoria durante la registrazione.

### 👥 Dashboard Utenti

- **Dashboard Cliente**:
  - 🔍 Ricerca avanzata servizi con filtri e mappa interattiva.
  - 📅 Prenotazione servizi con selezione data e orario.
  - 💬 Chat in tempo reale con i fornitori.
  - 📋 Gestione prenotazioni e stato pagamenti.
- **Dashboard Fornitore**:
  - ➕ Creazione e gestione servizi offerti.
  - 📅 Calendario prenotazioni e gestione disponibilità.
  - 💬 Chat in tempo reale con i clienti.
  - ✅ Completamento servizi con upload prova fotografica.
- **Dashboard Amministratore**:
  - 🛡️ Gestione completa di utenti, servizi e prenotazioni.
  - 🚫 Moderazione contenuti e risoluzione dispute.

### 💬 Sistema di Chat in Tempo Reale

- **Socket.IO**: Comunicazione istantanea tra cliente e fornitore.
- **Notifiche**: Contatore messaggi non letti in tempo reale.
- **Storico**: Salvataggio conversazioni nel database.
- **Supporto Legacy**: Compatibilità garantita con vecchie chiamate API.

### 💳 Sistema di Pagamento Escrow (Simulato/Stripe Ready)

- **Sicurezza**: I fondi vengono trattenuti fino al completamento del servizio.
- **Rilascio**: Pagamento sbloccato solo dopo conferma e prova fotografica.
- **Rimborso**: Gestione automatica rimborsi in caso di cancellazione.

## Stack Tecnologico

- **Frontend**: React 19, Vite, TypeScript, CSS Modules.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: Prisma ORM (SQLite per dev, PostgreSQL ready).
- **Real-time**: Socket.IO.
- **Sicurezza**: Helmet, Rate Limiting, Express Validator, BCrypt.

## Installazione e Avvio

### Prerequisiti

- Node.js (v18+)
- npm

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
   Copia il file `.env.example` in `.env` e configura le variabili necessarie (Database, JWT Secret, ecc.).

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

## Stato del Progetto

**Versione Attuale**: v1.0.0 (Stable)

### ✅ Funzionalità Completate

- [x] Autenticazione completa (JWT, Cookie).
- [x] CRUD Servizi e Prenotazioni.
- [x] Chat in tempo reale (Socket.IO) con notifiche.
- [x] Dashboard Admin completa.
- [x] Upload immagini (Multer).
- [x] UI/UX Moderna e Responsiva.
- [x] Gestione errori e logging.

### 🚧 Roadmap Futura

- [ ] Integrazione completa Stripe Connect per pagamenti reali.
- [ ] Sistema di recensioni e rating avanzato.
- [ ] App mobile (React Native).

## Licenza

ISC
