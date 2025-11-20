#  Servizi di Pulizia - Piattaforma di Prenotazione

Benvenuto nella piattaforma di prenotazione servizi di pulizia "AirBnB Style". Questa applicazione permette ai clienti di trovare e prenotare servizi di pulizia locali e ai fornitori di gestire le proprie offerte e prenotazioni, con un sistema di pagamento sicuro basato su Escrow.

---

##  Funzionalità Principali

###  Ruoli Utente
*   **Cliente**: Cerca servizi, prenota appuntamenti, gestisce le prenotazioni e visualizza lo stato dei pagamenti.
*   **Fornitore**: Pubblica servizi, gestisce le prenotazioni in arrivo, carica prove fotografiche del lavoro svolto per sbloccare i pagamenti.

###  Ricerca Intelligente & Geolocalizzazione
*   **Ricerca per Parola Chiave**: Filtra i servizi per nome o descrizione.
*   **Geolocalizzazione Integrata**:
    *   Utilizza **OpenStreetMap** e **Leaflet** per una mappa interattiva gratuita.
    *   **Autocompletamento Indirizzi**: Suggerimenti in tempo reale per città e vie (tramite Nominatim).
    *   **Calcolo Distanze**: Mostra solo i servizi entro un raggio di 50km dalla posizione selezionata.
    *   **Rilevamento Posizione**: Pulsante "Posizione attuale" per trovare servizi vicini a te.

###  Sistema di Pagamento "Escrow" Simulato
1.  Il cliente prenota un servizio -> Il pagamento viene **trattenuto** (stato: \held_in_escrow\).
2.  Il fornitore esegue il lavoro.
3.  Il fornitore carica una **foto prova** del lavoro completato.
4.  Il sistema verifica la prova e **rilascia** il pagamento al fornitore (stato: \eleased\).

###  Sicurezza & Autenticazione
*   Registrazione e Login sicuri con password hashate (bcrypt).
*   Token JWT (JSON Web Tokens) per la gestione delle sessioni.
*   Protezione contro attacchi comuni (Rate Limiting, Helmet, Sanitizzazione Input).

---

##  Documentazione Tecnica

### Architettura del Progetto
Il progetto è strutturato come una **Single Page Application (SPA)** moderna:

*   **Frontend**: React 19 + Vite + TypeScript.
    *   Gestisce l'interfaccia utente, la mappa interattiva e la logica client-side.
    *   Comunica con il backend tramite API REST.
*   **Backend**: Node.js + Express 5 + TypeScript.
    *   Gestisce le API, l'autenticazione, la logica di business e il salvataggio dei dati.
    *   Serve i file statici del frontend in produzione.
*   **Database**: JSON Files (In-memory simulation).
    *   I dati (utenti, servizi, prenotazioni) sono salvati in file JSON locali nella cartella \data/\ per semplicità di sviluppo.

### Struttura delle Cartelle
\\\
Copilot_test/
 src/                 # Codice sorgente Backend (Node.js/Express)
    server.ts        # Entry point del server
    types.ts         # Definizioni TypeScript condivise
 src-react/           # Codice sorgente Frontend (React)
    components/      # Componenti riutilizzabili (SearchBar, Dashboard, ecc.)
    pages/           # Pagine principali (Home)
    styles/          # File CSS
    App.tsx          # Componente radice e Routing
    main.tsx         # Entry point React
 public/              # File statici (immagini, upload)
 data/                # Database JSON (creati automaticamente)
 vite.config.ts       # Configurazione Vite
\\\

### Tecnologie Chiave
*   **Mappe**: \leaflet\, \eact-leaflet\ (OpenStreetMap) - *Nessuna API Key richiesta!*
*   **Routing**: \eact-router-dom\ v7.
*   **Uploads**: \multer\ per la gestione dei file (foto prove).
*   **Sicurezza**: \helmet\, \express-rate-limit\, \express-validator\, \cryptjs\, \jsonwebtoken\.
*   **Dev Tools**: \concurrently\ (per eseguire frontend e backend insieme), \
odemon\.

---

##  Installazione e Avvio

### Prerequisiti
*   Node.js (v18 o superiore consigliato)
*   npm (incluso con Node.js)

### Setup Iniziale
1.  **Clona il repository**:
    \\\ash
    git clone https://github.com/MassimoMarrone/Copilot_test.git
    cd Copilot_test
    \\\

2.  **Installa le dipendenze**:
    \\\ash
    npm install
    \\\

3.  **Configura l'ambiente**:
    Il file \.env\ è già pre-configurato per lo sviluppo. Assicurati che esista nella root del progetto:
    \\\env
    PORT=3000
    JWT_SECRET=your-secret-key-change-in-production
    # Non servono chiavi API per le mappe!
    \\\

### Avvio in Sviluppo (Consigliato)
Per avviare sia il Backend che il Frontend in modalità "watch" (ricarica automatica alle modifiche):

\\\ash
npm run dev:full
\\\
*   Il **Frontend** sarà disponibile su: \http://localhost:5173\
*   Il **Backend** sarà attivo su: \http://localhost:3000\

### Build per Produzione
Per compilare tutto il progetto (TypeScript backend + React build):

\\\ash
npm run build
npm start
\\\
L'applicazione sarà accessibile su \http://localhost:3000\.

---

##  Note per lo Sviluppatore

*   **Mappe**: Abbiamo migrato da Google Maps a **OpenStreetMap** per evitare costi e complessità di gestione delle API Key. La libreria \leaflet\ gestisce la visualizzazione e \
ominatim\ la ricerca degli indirizzi.
*   **Routing**: Le rotte lato client (es. \/client-dashboard\) sono gestite da React Router. Il backend è configurato per reindirizzare tutte le richieste non-API all'index.html di React (\*splat\ route).
*   **Dati**: Se vuoi resettare il database, puoi cancellare in sicurezza i file \.json\ dentro la cartella \data/\. Verranno ricreati vuoti al riavvio del server.

---

##  Licenza
ISC
