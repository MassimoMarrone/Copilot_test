# Servizi di Pulizia - AirBnB Style Booking App

Applicazione web per la prenotazione di servizi di pulizia con sistema di pagamento escrow.

## Funzionalità

### Autenticazione & Legale
- ✅ Registrazione con accettazione obbligatoria dei Termini & Condizioni
- ✅ Login separato per Clienti e Fornitori
- ✅ Termini e Condizioni completi visualizzati durante la registrazione

### Dashboard Separate

#### Dashboard Cliente
- 🔍 Ricerca e visualizzazione di tutti i servizi disponibili
- 📅 Prenotazione servizi con selezione data
- 📋 Visualizzazione delle proprie prenotazioni
- 💰 Monitoraggio stato pagamenti (Escrow/Rilasciato)
- 📸 Visualizzazione prove fotografiche dei servizi completati

#### Dashboard Fornitore
- ➕ Creazione e gestione servizi offerti
- 📅 Visualizzazione prenotazioni ricevute
- ✅ Pulsante "Completa Servizio & Rilascia Payout"
- 📸 Upload obbligatorio di prova fotografica per rilascio pagamento
- 💰 Monitoraggio stato pagamenti

### Sistema di Pagamento Escrow
- 💳 Al momento della prenotazione, i fondi vengono trattenuti in escrow
- 🔒 Il pagamento rimane bloccato fino al completamento del servizio
- 📸 Il fornitore deve caricare una foto prova del lavoro completato
- ✅ Solo dopo l'upload della foto, il pagamento viene rilasciato al fornitore
- 🔐 Protezione per entrambe le parti della transazione

## Requisiti

- Node.js (v14 o superiore)
- npm

## Installazione

1. Clona il repository:
```bash
git clone https://github.com/MassimoMarrone/Copilot_test.git
cd Copilot_test
```

2. Installa le dipendenze:
```bash
npm install
```

3. (Opzionale) Configura le variabili d'ambiente:
```bash
cp .env.example .env
# Modifica .env con le tue configurazioni
```

4. Compila il codice TypeScript:
```bash
npm run build
```

5. Avvia il server:
```bash
npm start
```

6. Apri il browser e vai a:
```
http://localhost:3000
```

### Script Disponibili

- `npm run build` - Compila il codice TypeScript in JavaScript
- `npm start` - Avvia il server (richiede build precedente)
- `npm run dev` - Compila e avvia in un solo comando
- `npm run clean` - Pulisce la cartella dist

## Utilizzo

### Per i Clienti

1. Registrati selezionando "Cliente" come tipo di account
2. Accetta i Termini e Condizioni (obbligatorio)
3. Accedi alla Dashboard Cliente
4. Sfoglia i servizi disponibili
5. Prenota un servizio selezionando una data
6. Il pagamento sarà trattenuto in escrow
7. Monitora lo stato della tua prenotazione
8. Visualizza la prova fotografica quando il servizio è completato

### Per i Fornitori

1. Registrati selezionando "Fornitore" come tipo di account
2. Accetta i Termini e Condizioni (obbligatorio)
3. Accedi alla Dashboard Fornitore
4. Crea i tuoi servizi (titolo, descrizione, prezzo)
5. Visualizza le prenotazioni ricevute
6. Quando completi un servizio, clicca "Completa Servizio & Rilascia Payout"
7. Carica una foto prova del lavoro completato (obbligatorio)
8. Il pagamento verrà automaticamente rilasciato dall'escrow

## Sicurezza

### Implementazioni di Sicurezza Applicate

- ✅ **Password hashate con bcrypt** (12 rounds)
- ✅ **Autenticazione tramite JWT** con scadenza token (24h)
- ✅ **Cookie HTTP-only, Secure e SameSite** per prevenire XSS e CSRF
- ✅ **Helmet.js** per header di sicurezza HTTP
- ✅ **Rate Limiting** su tutte le route API (100 richieste/15min)
- ✅ **Rate Limiting Aggressivo** per autenticazione (5 tentativi/15min)
- ✅ **Validazione Input** con express-validator su tutti i campi
- ✅ **Upload File Sicuri** con validazione MIME type e limite dimensione (5MB)
- ✅ **TypeScript** per type safety e riduzione errori runtime
- ✅ **Validazione obbligatoria** dei termini e condizioni
- ✅ **Upload foto obbligatorio** prima del rilascio pagamento
- ✅ **Content Security Policy** (CSP) configurata
- ✅ **Sanitizzazione Email** con normalizzazione

### Buone Pratiche di Sicurezza

- Password minima 8 caratteri
- Token JWT con scadenza
- ID univoci generati in modo sicuro
- Gestione errori centralizzata
- Logging degli errori

## Tecnologie Utilizzate

- **Backend**: Node.js, Express.js con TypeScript
- **Autenticazione**: JWT, bcryptjs
- **Upload File**: Multer con validazione
- **Sicurezza**: Helmet.js, express-rate-limit, express-validator
- **Configurazione**: dotenv
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Storage**: File system (JSON files) - da sostituire con database in produzione

## Note

### Versione TypeScript con Sicurezza Migliorata

Questa versione include:
- ✅ Backend scritto in TypeScript per maggiore sicurezza e manutenibilità
- ✅ Rate limiting implementato
- ✅ Validazione input su tutti i campi
- ✅ Header di sicurezza HTTP (Helmet)
- ✅ Gestione errori robusta

### Ulteriori Miglioramenti per Produzione

- In produzione, sostituire il sistema di storage basato su file con un database (MongoDB, PostgreSQL, etc.)
- Implementare un sistema di pagamento reale (Stripe, PayPal, etc.)
- Aggiungere SSL/HTTPS obbligatorio
- Aggiungere validazione email con conferma via email
- Implementare sistema di notifiche (email, push)
- Aggiungere protezione CSRF più robusta
- Aggiungere logging strutturato e monitoring
- Implementare backup automatici dei dati

## Considerazioni sulla Sicurezza

Questa applicazione è un prototipo e presenta alcune limitazioni di sicurezza che dovrebbero essere affrontate prima di un deployment in produzione:

1. **Rate Limiting**: Non è implementato il rate limiting sulle route API. In produzione, utilizzare pacchetti come `express-rate-limit` per prevenire attacchi di tipo brute-force.

2. **CSRF Protection**: Non è implementata la protezione CSRF. In produzione, utilizzare pacchetti come `csurf` per proteggere contro attacchi CSRF.

3. **JWT Secret**: La chiave segreta JWT è hardcoded. In produzione, utilizzare variabili d'ambiente sicure.

4. **Validazione Input**: La validazione degli input è minima. In produzione, implementare validazione robusta con pacchetti come `joi` o `express-validator`.

5. **File Upload**: I controlli sui file upload sono limitati. In produzione, implementare validazione del tipo di file, dimensione massima, e scansione antivirus.

6. **Database**: I dati sono salvati in file JSON. In produzione, utilizzare un database sicuro con backup regolari.

7. **HTTPS**: L'applicazione non forza HTTPS. In produzione, utilizzare sempre connessioni sicure.

## Licenza

ISC