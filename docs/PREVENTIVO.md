# 📋 Preventivo - Piattaforma Domy

**Marketplace Servizi Domestici Professionali**

---

## 🏢 Informazioni Progetto

| Campo               | Valore                  |
| ------------------- | ----------------------- |
| **Nome Progetto**   | Domy                    |
| **Tipologia**       | Piattaforma Web B2C/B2B |
| **Versione**        | 1.2.0 (Stabile)         |
| **Data Preventivo** | Novembre 2025           |
| **Validità**        | 30 giorni               |

---

## 📖 Descrizione del Prodotto

**Domy** è una piattaforma web completa per la prenotazione di servizi domestici professionali (pulizie, manutenzione, giardinaggio, ecc.) che mette in contatto clienti e fornitori di servizi.

### Caratteristiche Principali:

- 🔐 Sistema di autenticazione sicuro (JWT + Google OAuth)
- 📅 Prenotazione intelligente con stima automatica durata e prezzo
- 💳 Pagamenti sicuri con sistema escrow (Stripe)
- 💬 Chat in tempo reale tra cliente e fornitore
- ⭐ Sistema di recensioni e rating
- 🗺️ Ricerca geolocalizzata con mappa interattiva
- 📱 Design responsive (desktop, tablet, mobile)
- 🛡️ Pannello amministrazione completo

---

## 💻 Stack Tecnologico

| Layer         | Tecnologie                                   |
| ------------- | -------------------------------------------- |
| **Frontend**  | React 19, TypeScript, Vite 7, React Router 7 |
| **Backend**   | Node.js, Express 5, TypeScript               |
| **Database**  | PostgreSQL (Neon), Prisma ORM                |
| **Real-time** | Socket.IO                                    |
| **Pagamenti** | Stripe API (escrow)                          |
| **Mappe**     | Leaflet, OpenStreetMap                       |
| **Auth**      | JWT, Google OAuth 2.0                        |
| **Deploy**    | Render.com                                   |

---

## 📦 Moduli Inclusi

### 1. Autenticazione & Utenti

- ✅ Registrazione con verifica email
- ✅ Login standard e Google OAuth
- ✅ Username personalizzato
- ✅ Profilo utente completo
- ✅ Gestione ruoli (Cliente, Fornitore, Admin)
- ✅ Reset password

### 2. Gestione Servizi

- ✅ CRUD servizi con immagini
- ✅ Categorie servizi
- ✅ Geolocalizzazione servizi
- ✅ Prodotti/materiali utilizzati
- ✅ Gestione disponibilità calendario

### 3. Sistema Prenotazioni

- ✅ Prenotazione intelligente (stima durata automatica)
- ✅ Calcolo prezzo dinamico
- ✅ Gestione slot orari
- ✅ Prevenzione sovrapposizioni
- ✅ Cancellazione con rimborso automatico

### 4. Pagamenti (Stripe)

- ✅ Checkout sicuro
- ✅ Sistema escrow (trattenuta fondi)
- ✅ Rilascio pagamento a servizio completato
- ✅ Rimborsi automatici
- ✅ Webhook per eventi

### 5. Comunicazione

- ✅ Chat real-time (Socket.IO)
- ✅ Notifiche in-app
- ✅ Email transazionali
- ✅ Contatore messaggi non letti

### 6. Recensioni

- ✅ Rating multi-criterio
- ✅ Commenti testuali
- ✅ Risposte del fornitore
- ✅ Voti "utile"
- ✅ Media automatica

### 7. Ricerca Avanzata

- ✅ Filtri server-side (categoria, prezzo, prodotti)
- ✅ Ricerca geolocalizzata (raggio 50km)
- ✅ Mappa interattiva Leaflet
- ✅ Infinite scroll
- ✅ Paginazione ottimizzata

### 8. Pannello Admin

- ✅ Dashboard statistiche
- ✅ Gestione utenti (blocco/sblocco)
- ✅ Gestione servizi
- ✅ Gestione prenotazioni
- ✅ Impostazioni piattaforma

### 9. UI/UX

- ✅ Design responsive (mobile-first)
- ✅ Skeleton loading
- ✅ Toast notifications
- ✅ Icone SVG professionali
- ✅ Tema moderno e pulito

---

## 💰 Dettaglio Economico

### Breakdown per Area

| Area di Sviluppo          | Ore  | Tariffa | Subtotale |
| ------------------------- | ---- | ------- | --------- |
| **Architettura & Setup**  | 20h  | €50/h   | €1.000    |
| **Backend API**           | 90h  | €50/h   | €4.500    |
| **Frontend React**        | 110h | €50/h   | €5.500    |
| **Pannello Admin**        | 35h  | €50/h   | €1.750    |
| **Sistema Pagamenti**     | 28h  | €50/h   | €1.400    |
| **Chat Real-time**        | 18h  | €50/h   | €900      |
| **Sistema Prenotazioni**  | 25h  | €50/h   | €1.250    |
| **Geolocalizzazione**     | 12h  | €50/h   | €600      |
| **Sistema Recensioni**    | 18h  | €50/h   | €900      |
| **UI/UX & Responsive**    | 35h  | €50/h   | €1.750    |
| **Database & Migrazioni** | 18h  | €50/h   | €900      |
| **Deploy & DevOps**       | 12h  | €50/h   | €600      |
| **Documentazione**        | 12h  | €50/h   | €600      |
| **Testing & Debug**       | 25h  | €50/h   | €1.250    |

|     |     | **TOTALE ORE** | **458h**    |
| --- | --- | -------------- | ----------- |
|     |     | **TOTALE**     | **€22.900** |

---

## 🎁 Opzioni di Acquisto

### Opzione A - Licenza Base

**€15.000** (IVA esclusa)

Include:

- ✅ Codice sorgente completo
- ✅ Documentazione tecnica
- ✅ 1 deploy iniziale
- ✅ 30 giorni supporto email

---

### Opzione B - Chiavi in Mano (Consigliata)

**€22.000** (IVA esclusa)

Include:

- ✅ Tutto di Opzione A
- ✅ Configurazione ambiente produzione
- ✅ Setup Stripe account
- ✅ Configurazione dominio personalizzato
- ✅ SSL/HTTPS
- ✅ 3 mesi supporto tecnico
- ✅ 2 ore di formazione

---

### Opzione C - Premium Enterprise

**€35.000** (IVA esclusa)

Include:

- ✅ Tutto di Opzione B
- ✅ Customizzazione grafica completa
- ✅ Branding personalizzato
- ✅ App mobile (React Native) - MVP
- ✅ 6 mesi supporto prioritario
- ✅ SLA 24h per bug critici
- ✅ 5 ore di formazione

---

## 🔧 Servizi Aggiuntivi

| Servizio                | Prezzo    |
| ----------------------- | --------- |
| Customizzazione grafica | €80/h     |
| Nuove funzionalità      | €60/h     |
| Manutenzione mensile    | €300/mese |
| Supporto prioritario    | €500/mese |
| Hosting gestito         | €100/mese |
| Backup giornalieri      | €50/mese  |

---

## 📅 Tempistiche

| Opzione   | Consegna      |
| --------- | ------------- |
| Opzione A | 1 settimana   |
| Opzione B | 2 settimane   |
| Opzione C | 4-6 settimane |

---

## 💳 Modalità di Pagamento

- **30%** all'accettazione del preventivo
- **40%** a metà progetto
- **30%** alla consegna

Pagamento tramite: Bonifico bancario, PayPal, Stripe

---

## 📞 Contatti

Per ulteriori informazioni o per procedere con l'ordine:

- **Email**: [inserire email]
- **Telefono**: [inserire telefono]
- **Website**: [inserire sito]

---

## ✍️ Accettazione

Per accettare questo preventivo, si prega di:

1. Firmare il presente documento
2. Inviare copia firmata via email
3. Effettuare il pagamento dell'acconto (30%)

---

**Data**: ********\_********

**Firma Cliente**: ********\_********

**Firma Fornitore**: ********\_********

---

_Questo preventivo è valido per 30 giorni dalla data di emissione._
