# Domy - Piattaforma di Prenotazione Servizi di Pulizia

Applicazione web moderna per la prenotazione di servizi di pulizia professionale con sistema di prenotazione intelligente, pagamento escrow, chat in tempo reale e dashboard dedicate.

## 🌟 Funzionalità Principali

### 🔐 Autenticazione & Sicurezza

- **Registrazione & Login**: Accesso separato per Clienti e Fornitori con autenticazione JWT sicura.
- **Google OAuth**: Login rapido con account Google.
- **Username personalizzato**: Gli utenti possono scegliere un username univoco.
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

- **Autorizzazione Ritardata**: Al momento della prenotazione, il pagamento viene **autorizzato** ma non catturato.
- **Cancellazione Gratuita (48h)**: Entro 48h dalla prenotazione, sia il cliente che il cleaner possono cancellare **senza costi**.
- **Cattura Automatica**: Dopo 48h, un cron job cattura automaticamente il pagamento.
- **Cattura Anticipata**: Se il servizio viene completato prima delle 48h, il pagamento viene catturato immediatamente.
- **Rilascio**: Pagamento trasferito al provider solo dopo conferma del cliente (o auto-conferma dopo 24h).

#### Policy Cancellazione (dopo cattura)

| Chi cancella | Cliente riceve | Fee Stripe (~3%) |
|--------------|----------------|------------------|
| **Cliente** | Importo - fee | Pagata dal cliente |
| **Cleaner** | 100% rimborso | Pagata dal cleaner |

#### Flusso Pagamento

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PRENOTAZIONE  │────▶│  AUTORIZZATO    │────▶│  HELD_IN_ESCROW │
│                 │     │  (48h finestra) │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                    Cancellazione?              Provider completa?
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  CANCELLED      │     │ AWAITING_CONFIRM│
                        │  (nessuna fee)  │     │                 │
                        └─────────────────┘     └─────────────────┘
                                                        │
                                                Cliente conferma?
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   RELEASED TO   │
                                                │    PROVIDER     │
                                                └─────────────────┘
```

#### Note importanti su escrow, saldo e rimborsi

- **Dove finiscono i soldi quando il cliente paga**: l’incasso va sul **saldo Stripe della piattaforma** (non direttamente al provider). L’“escrow” è gestito a livello applicativo (stato `held_in_escrow` nel DB) e il payout al provider avviene con un **Transfer** solo quando il servizio è confermato.
- **`pending` vs `available`**: vedere un pagamento in dashboard o un “saldo” non significa che i fondi siano subito trasferibili. Stripe rende i fondi trasferibili solo quando sono in **available balance**.
- **Errore `balance_insufficient` al rilascio payout**: può succedere anche se “sembra” che i soldi siano arrivati. Tipicamente accade quando i fondi sono ancora **pending** oppure già **allocati** a un payout in uscita (“Bonifici previsto…”). In produzione non è garantito che i fondi diventino available immediatamente dopo il pagamento.
- **Implicazione UX/operativa**: la conferma del cliente può fallire temporaneamente se i fondi non sono ancora available; in quel caso va previsto un **retry** (manuale o automatico) del transfer.

#### Fee Stripe e rimborsi

- **Fee Stripe (processing fee)**: viene applicata al momento del pagamento. In molti casi (soprattutto in live) **non viene restituita** quando fai un rimborso: quindi puoi rimborsare il **100% al cliente**, ma la piattaforma potrebbe comunque sostenere la fee.
- **Rimborsi parziali**: è possibile rimborsare “totale meno fee”, ma è una scelta di policy/UX (il cliente riceve meno del totale) e va comunicata chiaramente.

#### Test Mode (sviluppo)

- In test mode Stripe può richiedere fondi “available” prima di permettere un transfer. Se incontri `balance_insufficient` durante la conferma, Stripe suggerisce di usare la carta test **`4000 0000 0000 0077`** per generare saldo available (vedi documentazione Stripe su _available balance_).

### 🎨 UI/UX Moderna

- **Landing Page Professionale**: Design con gradiente scuro e immagine hero.
- **Icone SVG Minimal**: Stile coerente e professionale (Feather Icons style).
- **Form Prenotazione 3 Step**: Wizard intuitivo per la prenotazione.
- **Responsive Design**: Layout ottimizzato per desktop, tablet e mobile.
- **Notifiche Toast**: Feedback visivo per le azioni utente.
- **Skeleton Loading**: Placeholder animati durante il caricamento per UX fluida.

### 🔍 Ricerca Avanzata

- **Ricerca Server-Side**: Filtri applicati direttamente sul database per performance ottimali.
- **Filtri Multipli**: Categoria, range prezzo, prodotti utilizzati.
- **Geolocalizzazione**: Ricerca per posizione con formula Haversine (raggio 50km).
- **Infinite Scroll**: Caricamento progressivo con paginazione server-side.
- **Mappa Interattiva**: Visualizzazione servizi su mappa Leaflet.

### ⭐ Sistema Recensioni

- **Rating Dettagliato**: Valutazione su più criteri (puntualità, qualità, comunicazione).
- **Commenti e Risposte**: I provider possono rispondere alle recensioni.
- **Media Voti**: Calcolo automatico rating medio per servizio.
- **Voti Utili**: Gli utenti possono votare le recensioni più utili.

## 🛠️ Stack Tecnologico

- **Frontend**: React 19, Vite 7, TypeScript, React Router 7, React DatePicker, Leaflet Maps.
- **Backend**: Node.js, Express 5, TypeScript.
- **Database**: PostgreSQL (Neon) con Prisma ORM + backup PITR automatici.
- **Real-time**: Socket.IO per chat e notifiche.
- **Pagamenti**: Stripe API con sistema escrow.
- **Email**: Brevo (Sendinblue) API per email transazionali.
- **Storage**: Cloudinary per immagini e documenti.
- **Auth**: JWT (HttpOnly Cookie) + Google OAuth.
- **Sicurezza**: Helmet, Rate Limiting, Express Validator, BCrypt.
- **Monitoring**: Sentry per error tracking, Winston per logging.
- **Deploy**: Render.com con build automatizzati.

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
   # Database
   DATABASE_URL="postgresql://..."

   # Auth
   JWT_SECRET="your-secret-key-min-32-chars"

   # Stripe (usa sk_test_ per development, sk_live_ per produzione)
   STRIPE_SECRET_KEY="sk_..."
   STRIPE_PUBLISHABLE_KEY="pk_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."

   # Email (Brevo/Sendinblue)
   BREVO_API_KEY="xkeysib-..."
   MAIL_FROM="noreply@tuodominio.it"
   MAIL_FROM_NAME="Domy Platform"

   # Cloudinary (per upload immagini/documenti)
   CLOUDINARY_CLOUD_NAME="..."
   CLOUDINARY_API_KEY="..."
   CLOUDINARY_API_SECRET="..."

   # Google OAuth (opzionale)
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."

   # Google Maps
   GOOGLE_MAPS_API_KEY="..."

   # Monitoring (opzionale, solo produzione)
   SENTRY_DSN="https://..."

   # URLs
   FRONTEND_URL="http://localhost:5173"  # o URL produzione
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

**Versione Attuale**: v1.2.0

### ✅ Funzionalità Completate

- [x] Autenticazione completa (JWT, Cookie, Verifica Email).
- [x] **Google OAuth** per login rapido.
- [x] **Username personalizzato** per ogni utente.
- [x] CRUD Servizi e Prenotazioni.
- [x] **Sistema di prenotazione intelligente** (stima durata, prezzo dinamico).
- [x] **Gestione slot orari** con prevenzione sovrapposizioni.
- [x] Chat in tempo reale (Socket.IO) con notifiche.
- [x] Dashboard Admin completa con gestione utenti/servizi/prenotazioni.
- [x] Upload immagini (Multer).
- [x] Pagamenti Stripe con escrow e rimborsi automatici.
- [x] UI/UX Moderna con icone SVG professionali.
- [x] Calendario React DatePicker in italiano.
- [x] **Sistema recensioni completo** con rating dettagliato e risposte provider.
- [x] **Ricerca server-side** con filtri (categoria, prezzo, prodotti, posizione).
- [x] **Geolocalizzazione** con formula Haversine per ricerca per distanza.
- [x] **Infinite scroll** con paginazione server-side.
- [x] **Skeleton loading** per UX migliorata.
- [x] **Design responsive** ottimizzato per mobile.
- [x] **Mappa interattiva** con Leaflet per visualizzazione servizi.

### 🚧 Roadmap Futura

#### 🔴 Da Fare Prima del Lancio

- [ ] **Stripe Live Keys** - Configurare chiavi Stripe di produzione
- [ ] **Verifica Env Vars** - Checklist finale variabili ambiente su Render
- [ ] **Privacy & Legal** - Privacy Policy, Terms of Service, Cookie Policy

#### ✅ Completati

- [x] Health Check endpoint (`/api/health`)
- [x] Sentry error tracking
- [x] Provider Onboarding con upload documenti
- [x] Email notifiche approvazione/rifiuto onboarding
- [x] Notifiche in-app real-time (Socket.IO)
- [x] Cloud Storage (Cloudinary)
- [x] Code splitting e lazy loading componenti.

#### 🟡 Post-Lancio (Priorità Media)

- [ ] PWA con supporto offline e notifiche push
- [ ] 2FA (Two-Factor Authentication)
- [ ] Grafici analytics nella dashboard admin
- [ ] Sistema referral "invita un amico"
- [ ] Codici sconto/coupon
- [ ] Chat migliorata (invio immagini, messaggi vocali)

#### 🟢 Lungo Termine (Priorità Bassa)

- [ ] App mobile (React Native)
- [ ] Multi-lingua (i18n)
- [ ] Sistema abbonamenti fornitori
- [ ] Fatturazione automatica PDF
- [ ] AI Chatbot supporto

---

## 🗄️ Storage & Backup

### Cloudinary vs S3

| Uso               | Cloudinary                       | S3         |
| ----------------- | -------------------------------- | ---------- |
| **Foto/Video**    | ⭐⭐⭐⭐⭐ (ottimizzazione auto) | ⭐⭐⭐     |
| **Backup DB**     | ❌ Non adatto                    | ⭐⭐⭐⭐⭐ |
| **PDF/Documenti** | 🟡 Possibile                     | ⭐⭐⭐⭐⭐ |
| **Costo**         | €€                               | €          |

**Configurazione attuale:**

- **Cloudinary** → Documenti ID fornitori, foto servizi ✅
- **Neon PostgreSQL** → Backup automatici PITR (7 giorni) ✅

### Backup Database

Neon include **Point-in-Time Recovery (PITR)**:

- **7 giorni di retention** (piano Free)
- **30 giorni** (piano Pro)
- Backup automatici, nessuna configurazione richiesta

---

## 🔧 TODO - Miglioramenti per Produzione

### 🔴 CRITICI (Prima del Go-Live)

| #   | Task                       | Descrizione                                                                                              | Status |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Stripe Live Keys**       | Configurare `STRIPE_SECRET_KEY` e `STRIPE_PUBLISHABLE_KEY` live su Render                                | 🔲     |
| 2   | **Verifica Env Vars**      | Controllare che tutte le variabili siano configurate su Render (DATABASE_URL, GOOGLE_MAPS_API_KEY, etc.) | 🔲     |
| 3   | **Google OAuth Domini**    | Aggiungere dominio produzione nella Google Cloud Console                                                 | ✅     |
| 4   | **Race Condition Booking** | Implementare lock/transazione per prenotazioni simultanee                                                | ✅     |

### 🟠 IMPORTANTI (Raccomandati)

| #   | Task                      | Descrizione                                                                       | Tempo Stimato | Status |
| --- | ------------------------- | --------------------------------------------------------------------------------- | ------------- | ------ |
| 5   | **Health Check Endpoint** | Aggiungere `/api/health` per monitoring Render                                    | 10 min        | ✅     |
| 6   | **Cloud Storage**         | Migrare upload immagini su Cloudinary/S3 (i file su Render si perdono al restart) | 2-4h          | ✅     |
| 7   | **Provider Onboarding**   | Sistema di onboarding provider con upload documenti e approvazione admin          | 4h            | ✅     |
| 8   | **Monitoring (Sentry)**   | Setup error tracking per ricevere alert su errori in produzione                   | 1h            | ✅     |
| 9   | **Backup Database**       | Verificare backup automatici su Neon PostgreSQL                                   | 30 min        | 🔲     |

### 🟡 MIGLIORAMENTI (Post-Lancio)

| #   | Task                    | Descrizione                                                      | Priorità |
| --- | ----------------------- | ---------------------------------------------------------------- | -------- |
| 10  | **Transazioni DB**      | Usare `$transaction` per operazioni critiche (booking + payment) | ✅ Fatto |
| 11  | **Test Coverage**       | Aggiungere test per auth, payments, chat                         | Media    |
| 12  | **Rate Limiting Redis** | Per scaling con più istanze                                      | Bassa    |
| 13  | **Soft Delete**         | Implementare soft delete per servizi e booking                   | Bassa    |

### 🎯 PROSSIMI PASSI

1. ~~**Health Check Endpoint** - Aggiungere `/api/health` per monitoring Render~~ ✅
2. **Stripe Live Keys** - Configurare chiavi Stripe di produzione su Render
3. **Verifica Env Vars** - Checklist finale variabili ambiente su Render
4. **Test Onboarding** - Testare il flusso completo di onboarding provider
5. ~~**Sentry** - Setup error tracking per produzione~~ ✅ (aggiungere `SENTRY_DSN` su Render)

### ⚠️ Race Condition - Prenotazioni Simultanee

**Problema Attuale:** Se due utenti prenotano lo stesso slot nello stesso momento:

1. Utente A controlla disponibilità → Slot libero ✅
2. Utente B controlla disponibilità → Slot libero ✅
3. Utente A crea prenotazione → OK
4. Utente B crea prenotazione → OK (dovrebbe fallire!)

**Soluzione da implementare:**

```typescript
// Usare Prisma transaction con lock pessimistico
await prisma.$transaction(async (tx) => {
  // Lock sulla riga del servizio
  const service = await tx.service.findUnique({
    where: { id: serviceId },
  });

  // Ri-verifica disponibilità dentro la transazione
  const conflict = await tx.booking.findFirst({
    where: { /* condizioni overlap */ }
  });

  if (conflict) throw new Error("Slot non più disponibile");

  // Crea booking
  return tx.booking.create({ data: {...} });
});
```

---

### Priorità Alta (1-2 settimane)

| Task                    | Descrizione                                                  | Impatto | Status        |
| ----------------------- | ------------------------------------------------------------ | ------- | ------------- |
| 🧪 **Testing**          | Aggiungere test unitari per auth, booking, payment           | Critico | 🔲            |
| 🛡️ **Error Boundaries** | Implementare error boundaries in React                       | Alto    | 🔲            |
| ✅ **Logging**          | Winston con logging strutturato (auth, booking, email, HTTP) | Alto    | ✅ Completato |
| 🔔 **Monitoring**       | Setup Sentry per error tracking                              | Alto    | 🔲            |

### Priorità Media (1 mese)

| Task            | Descrizione                              | Impatto |
| --------------- | ---------------------------------------- | ------- |
| ⚡ **Caching**  | Implementare Redis per sessioni e cache  | Medio   |
| 🖼️ **Immagini** | Ottimizzazione WebP + lazy loading       | Medio   |
| 📱 **PWA**      | Support offline e push notifications     | Medio   |
| 👨‍💼 **Admin**    | Completare dashboard admin con analytics | Medio   |

### Priorità Bassa (2-3 mesi)

| Task                | Descrizione                 | Impatto |
| ------------------- | --------------------------- | ------- |
| 📲 **Mobile App**   | Sviluppo React Native       | Basso   |
| 🌍 **Multi-lingua** | Supporto EN/IT/ES           | Basso   |
| 🎁 **Referral**     | Sistema invita un amico     | Basso   |
| 📊 **Analytics**    | Dashboard metriche avanzate | Basso   |

### 📈 Valutazione Attuale

| Aspetto        | Voto               | Note                                      |
| -------------- | ------------------ | ----------------------------------------- |
| Funzionalità   | ⭐⭐⭐⭐⭐⭐⭐⭐⭐ | Feature complete per lancio               |
| Codice         | ⭐⭐⭐⭐⭐⭐⭐⭐   | Struttura solida, ben organizzato         |
| UI/UX          | ⭐⭐⭐⭐⭐⭐⭐⭐   | Professionale, responsive, consistente    |
| Sicurezza      | ⭐⭐⭐⭐⭐⭐⭐⭐   | JWT, bcrypt, helmet, rate limiting        |
| Performance    | ⭐⭐⭐⭐⭐⭐⭐½    | Pagination, skeleton, ricerca server-side |
| Testing        | ⭐⭐⭐⭐           | **Area da migliorare**                    |
| Documentazione | ⭐⭐⭐⭐⭐⭐⭐⭐   | README completo + /docs                   |

**Voto Complessivo: 8/10** - Pronta per MVP e beta testing pubblico.

---

## ⚙️ Tecniche e Pattern Implementati

### 🚀 Performance & Ottimizzazione

| Tecnica                    | Descrizione                                                                                           | Beneficio                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Server-Side Filtering**  | I filtri di ricerca vengono applicati direttamente nelle query Prisma sul database, non in JavaScript | Riduce il carico sul client, permette di cercare su migliaia di record |
| **Pagination Server-Side** | I risultati vengono paginati dal database con `skip` e `take`                                         | Carica solo 12 servizi per volta invece di tutti                       |
| **Infinite Scroll**        | `IntersectionObserver` rileva quando l'utente raggiunge il fondo pagina                               | UX fluida senza pulsanti "carica altro"                                |
| **Skeleton Loading**       | Placeholder animati con CSS durante il caricamento                                                    | Percezione di velocità, evita layout shift                             |
| **Haversine Formula**      | Calcolo distanza geodetica tra coordinate GPS                                                         | Ricerca servizi nel raggio di 50km dalla posizione utente              |
| **Debounce su Input**      | Ritardo prima di eseguire ricerche                                                                    | Riduce chiamate API durante la digitazione                             |

### 🔒 Sicurezza Implementata

| Tecnica                    | Implementazione                     | Protezione                                  |
| -------------------------- | ----------------------------------- | ------------------------------------------- |
| **JWT in HttpOnly Cookie** | Token non accessibile da JavaScript | Protezione XSS                              |
| **BCrypt Hashing**         | Salt rounds = 12 per password       | Password sicure anche se DB compromesso     |
| **Helmet.js**              | Headers di sicurezza automatici     | CSP, X-Frame-Options, HSTS                  |
| **Rate Limiting**          | Max 100 richieste/15min per IP      | Protezione brute force e DDoS               |
| **Express Validator**      | Validazione input server-side       | Protezione injection e dati malformati      |
| **CORS Configurato**       | Whitelist domini autorizzati        | Blocca richieste da origini non autorizzate |
| **Email Normalization**    | `.toLowerCase().trim()` su email    | Previene duplicati e bypass                 |

### 🏗️ Architettura & Pattern

| Pattern                   | Dove                                      | Beneficio                               |
| ------------------------- | ----------------------------------------- | --------------------------------------- |
| **MVC**                   | Backend (Controllers → Services → Prisma) | Separazione responsabilità, testabilità |
| **Context API**           | React AuthContext, AdminAuthContext       | State globale senza prop drilling       |
| **Service Layer**         | `src/services/`, `src-react/services/`    | Logica business centralizzata           |
| **Repository Pattern**    | Prisma come ORM                           | Astrazione database, query type-safe    |
| **Middleware Chain**      | Express (auth → validate → controller)    | Pipeline di elaborazione richieste      |
| **Component Composition** | React componenti modulari                 | Riutilizzo e manutenibilità             |

### 📡 Real-Time & Comunicazione

| Tecnica               | Uso                      | Beneficio                         |
| --------------------- | ------------------------ | --------------------------------- |
| **Socket.IO**         | Chat cliente-fornitore   | Messaggi istantanei senza polling |
| **Room-based Events** | Stanze per ogni booking  | Isolamento conversazioni          |
| **Unread Counter**    | Badge messaggi non letti | Notifica visiva real-time         |

---

## 🔮 Roadmap Tecnica - Ottimizzazioni Future

### 🎯 Performance (Impatto Utente Diretto)

| Tecnica                   | Descrizione                                                   | Impatto Stimato                          | Complessità |
| ------------------------- | ------------------------------------------------------------- | ---------------------------------------- | ----------- |
| **Code Splitting**        | `React.lazy()` + `Suspense` per caricare componenti on-demand | -60% bundle iniziale                     | ⭐⭐ Media  |
| **Lazy Loading Immagini** | `loading="lazy"` + Intersection Observer per immagini         | -40% tempo caricamento                   | ⭐ Bassa    |
| **WebP/AVIF Images**      | Conversione automatica immagini in formati moderni            | -50% peso immagini                       | ⭐⭐ Media  |
| **Service Worker (PWA)**  | Cache assets statici + offline support                        | Caricamento istantaneo dopo prima visita | ⭐⭐⭐ Alta |
| **Redis Caching**         | Cache query frequenti (lista servizi, categorie)              | -80% latenza API ripetute                | ⭐⭐ Media  |
| **CDN per Assets**        | Cloudflare/CloudFront per file statici                        | -50% latency globale                     | ⭐ Bassa    |
| **Database Indexing**     | Indici su colonne filtrate (category, price, location)        | -70% tempo query                         | ⭐ Bassa    |
| **Connection Pooling**    | PgBouncer per gestione connessioni DB                         | Supporto più utenti concorrenti          | ⭐⭐ Media  |

### 🛡️ Sicurezza Avanzata

| Tecnica                     | Descrizione                                    | Priorità |
| --------------------------- | ---------------------------------------------- | -------- |
| **CSRF Tokens**             | Token per protezione form submissions          | Alta     |
| **Content Security Policy** | Whitelist risorse esterne                      | Media    |
| **Audit Logging**           | Log azioni sensibili (login, pagamenti, admin) | Alta     |
| **2FA/MFA**                 | Autenticazione a due fattori                   | Media    |
| **Encryption at Rest**      | Crittografia dati sensibili nel DB             | Bassa    |

### 📊 Monitoring & Observability

| Tool                     | Scopo                                 | Priorità | Status          |
| ------------------------ | ------------------------------------- | -------- | --------------- |
| **Winston**              | Logging strutturato JSON              | Alta     | ✅ Implementato |
| **Sentry**               | Error tracking e crash reporting      | Alta     | 🔲              |
| **Prometheus + Grafana** | Metriche applicazione e dashboard     | Media    | 🔲              |
| **Uptime Monitoring**    | Alert downtime (UptimeRobot, Pingdom) | Alta     | 🔲              |

#### 📋 Sistema di Logging Implementato

Il progetto utilizza **Winston** per logging strutturato con le seguenti caratteristiche:

**Logger Specializzati:**

- `httpLogger` - Richieste HTTP (method, URL, status, response time)
- `authLogger` - Login, registrazione, logout
- `paymentLogger` - Transazioni Stripe, rimborsi
- `bookingLogger` - Creazione, completamento, cancellazione prenotazioni
- `emailLogger` - Invio email e notifiche
- `systemLogger` - Startup, shutdown, errori di sistema

**Configurazione:**

- **Console**: Output colorato con timestamp in sviluppo
- **File**: `logs/error.log` (solo errori), `logs/combined.log` (tutti i livelli)
- **Rotazione**: Max 5MB per file, max 5 file

**Middleware Express:**

- `requestLogger` - Log automatico di tutte le richieste HTTP
- `slowRequestLogger` - Alert per richieste lente (> 2 secondi)
- `errorLogger` - Cattura errori con stack trace

### 🧪 Testing & Quality

| Tipo                  | Tool                   | Coverage Target                            |
| --------------------- | ---------------------- | ------------------------------------------ |
| **Unit Tests**        | Jest + Testing Library | 70% business logic                         |
| **Integration Tests** | Supertest per API      | 80% endpoints critici                      |
| **E2E Tests**         | Playwright/Cypress     | Flussi principali (auth, booking, payment) |
| **Load Testing**      | k6 o Artillery         | 1000 utenti concorrenti                    |

### 🌍 Scalabilità Futura

| Tecnica                | Quando Implementare               | Beneficio                                            |
| ---------------------- | --------------------------------- | ---------------------------------------------------- |
| **Horizontal Scaling** | > 10k utenti/giorno               | Più istanze server                                   |
| **Message Queue**      | > 1000 email/ora                  | Bull/RabbitMQ per job async                          |
| **Microservizi**       | Team > 5 sviluppatori             | Servizi indipendenti (auth, payments, notifications) |
| **GraphQL**            | API complesse con molte relazioni | Query flessibili, meno over-fetching                 |
| **Kubernetes**         | Enterprise scale                  | Orchestrazione container automatica                  |

---

## 📁 Struttura Progetto

```
├── prisma/                 # Schema e migrazioni database
├── docs/                   # 📚 Documentazione tecnica dettagliata
│   ├── auth/               # Flussi autenticazione
│   ├── booking/            # Sistema prenotazioni
│   ├── payments/           # Pagamenti e escrow
│   ├── chat/               # Chat e notifiche
│   ├── services/           # Gestione servizi
│   ├── reviews/            # Sistema recensioni
│   └── dashboard/          # Dashboard utenti
├── src/                    # Backend (Node.js/Express)
│   ├── controllers/        # Controller API
│   ├── services/           # Logica business
│   ├── routes/             # Route API
│   └── middleware/         # Auth, validation, rate limiting
├── src-react/              # Frontend principale (React/Vite)
│   ├── components/         # Componenti React (25+)
│   ├── pages/              # Pagine principali
│   ├── services/           # API client services
│   ├── context/            # Auth context, state globale
│   └── styles/             # CSS per componenti
├── src-admin/              # Pannello Admin (React/Vite)
│   ├── components/         # Layout e componenti admin
│   ├── pages/              # Dashboard, Users, Services, Bookings
│   ├── context/            # Admin auth context
│   └── styles/             # CSS admin
└── public/                 # Asset statici e uploads
```

> 📖 **Documentazione Completa**: Consulta la cartella [`/docs`](./docs/README.md) per la documentazione tecnica dettagliata di ogni funzionalità.

## 📄 Licenza

ISC
