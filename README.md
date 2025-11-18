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

3. Avvia il server:
```bash
npm start
```

4. Apri il browser e vai a:
```
http://localhost:3000
```

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

- Password hashate con bcrypt
- Autenticazione tramite JWT
- Cookie HTTP-only per i token
- Validazione obbligatoria dei termini e condizioni
- Upload foto obbligatorio prima del rilascio pagamento

## Tecnologie Utilizzate

- **Backend**: Node.js, Express.js
- **Autenticazione**: JWT, bcryptjs
- **Upload File**: Multer
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Storage**: File system (JSON files) - da sostituire con database in produzione

## Note

- Questa è una versione demo/prototipo
- In produzione, sostituire il sistema di storage basato su file con un database (MongoDB, PostgreSQL, etc.)
- Implementare un sistema di pagamento reale (Stripe, PayPal, etc.)
- Aggiungere SSL/HTTPS
- Implementare rate limiting e altre misure di sicurezza
- Aggiungere validazione email
- Implementare sistema di notifiche (email, push)

## Licenza

ISC