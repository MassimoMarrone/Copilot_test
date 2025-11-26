# 📚 Documentazione Tecnica - Domy

Benvenuto nella documentazione tecnica di Domy. Qui troverai la descrizione dettagliata di ogni funzionalità con il flusso logico completo.

## 📑 Indice delle Funzionalità

### 🔐 Autenticazione & Utenti

- [Registrazione Utente](./auth/registrazione.md) ✅
- [Login e Sessione](./auth/login.md) ✅
- [Verifica Email](./auth/verifica-email.md) ✅

### 📅 Sistema di Prenotazione

- [Prenotazione Intelligente](./booking/prenotazione-intelligente.md) ✅
- [Calcolo Durata e Prezzo](./booking/calcolo-durata-prezzo.md) ✅
- [Gestione Slot Orari](./booking/gestione-slot.md) ✅
- [Cancellazione e Rimborsi](./booking/cancellazione-rimborsi.md) ✅

### 💳 Pagamenti

- [Flusso Pagamento Stripe](./payments/flusso-pagamento.md) ✅
- [Sistema Escrow](./payments/escrow.md) ✅

### 💬 Comunicazione

- [Chat Real-time](./chat/chat-realtime.md) ✅
- [Sistema Notifiche](./chat/notifiche.md) ✅

### 🔧 Servizi

- [Gestione Servizi](./services/gestione-servizi.md) ✅
- [Ricerca Geografica e Mappa](./services/ricerca-mappa.md) ✅

### ⭐ Recensioni

- [Sistema Recensioni](./reviews/sistema-recensioni.md) ✅

### 👥 Dashboard

- [Dashboard Cliente](./dashboard/client-dashboard.md) ✅
- [Dashboard Fornitore](./dashboard/provider-dashboard.md) ✅

---

## 🏗️ Architettura Generale

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│    Database     │
│  React + Vite   │     │ Node.js/Express │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        │               │   Socket.IO     │
        │               │   (Real-time)   │
        │               └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│     Stripe      │     │     Resend      │
│   (Pagamenti)   │     │    (Email)      │
└─────────────────┘     └─────────────────┘
```

## 🔗 Link Rapidi

- [README Principale](../README.md)
- [Schema Database](../prisma/schema.prisma)

---

## 📁 Struttura Documentazione

```
docs/
├── README.md                 # Questo file - Indice principale
├── auth/
│   ├── registrazione.md      # Flusso registrazione utente
│   ├── login.md              # Sistema JWT e sessioni
│   └── verifica-email.md     # Conferma email
├── booking/
│   ├── prenotazione-intelligente.md  # Wizard 3 step
│   ├── calcolo-durata-prezzo.md      # Algoritmo calcolo
│   ├── gestione-slot.md              # Generazione slot disponibili
│   └── cancellazione-rimborsi.md     # Policy cancellazione
├── payments/
│   ├── flusso-pagamento.md   # Stripe Checkout
│   └── escrow.md             # Sistema trattenimento fondi
├── chat/
│   ├── chat-realtime.md      # Socket.IO implementation
│   └── notifiche.md          # Sistema notifiche push
├── services/
│   ├── gestione-servizi.md   # CRUD servizi fornitore
│   └── ricerca-mappa.md      # PostGIS + Google Maps
├── reviews/
│   └── sistema-recensioni.md # Valutazioni e feedback
└── dashboard/
    ├── client-dashboard.md   # Vista cliente
    └── provider-dashboard.md # Vista fornitore
```
