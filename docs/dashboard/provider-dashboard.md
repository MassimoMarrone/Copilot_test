# 👨‍💼 Dashboard Fornitore

## Panoramica

La dashboard fornitore è il centro di controllo per chi offre servizi sulla piattaforma. Permette di gestire prenotazioni, servizi, guadagni e comunicazioni.

## Struttura Dashboard

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  PROVIDER DASHBOARD                                                        ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  📊 STATISTICHE RAPIDE                                              │ ║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │ ║
║  │  │ €1,250   │ │ 24       │ │ 4.8 ⭐   │ │ 3        │               │ ║
║  │  │ Guadagni │ │Prenotaz. │ │ Rating   │ │ In attesa│               │ ║
║  │  │ Mese     │ │ Mese     │ │ Medio    │ │          │               │ ║
║  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  📅 PRENOTAZIONI OGGI                                               │ ║
║  │  ┌───────────────────────────────────────────────────────────────┐ │ ║
║  │  │ 09:00 │ Pulizia Casa │ Mario Rossi │ Via Roma 10 │ ⏳ pending │ │ ║
║  │  │ 14:00 │ Pulizia Casa │ Anna Verdi  │ Via Torino 5│ ✅ confirmed│ │ ║
║  │  │ 17:00 │ Pulizia Uff. │ Luca Bianchi│ Corso XX   │ ⏳ pending │ │ ║
║  │  └───────────────────────────────────────────────────────────────┘ │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌────────────────────────────┐ ┌────────────────────────────────────┐   ║
║  │ 💬 MESSAGGI RECENTI        │ │ ⭐ ULTIME RECENSIONI               │   ║
║  │ ├─ Mario: "Ciao, a che..."│ │ ├─ ⭐⭐⭐⭐⭐ "Ottimo servizio!"   │   ║
║  │ ├─ Anna: "Confermo per..."│ │ ├─ ⭐⭐⭐⭐ "Buono ma puntualità" │   ║
║  │ └─ Luca: "Ho bisogno di..."│ │ └─ ⭐⭐⭐⭐⭐ "Super consigliato" │   ║
║  └────────────────────────────┘ └────────────────────────────────────┘   ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## Sezioni Principali

### 1. Statistiche

```tsx
interface ProviderStats {
  earningsThisMonth: number;
  earningsTotal: number;
  bookingsThisMonth: number;
  completedBookings: number;
  averageRating: number;
  totalReviews: number;
  pendingBookings: number;
  upcomingBookings: number;
}

// API
GET /api/provider/stats
Authorization: Bearer <token>

Response:
{
  "earningsThisMonth": 1250.00,
  "earningsTotal": 8500.00,
  "bookingsThisMonth": 24,
  "completedBookings": 156,
  "averageRating": 4.8,
  "totalReviews": 89,
  "pendingBookings": 3,
  "upcomingBookings": 7
}
```

### 2. Gestione Prenotazioni

```
╔═══════════════════════════════════════════════════════════════╗
║                  STATI PRENOTAZIONE                           ║
╚═══════════════════════════════════════════════════════════════╝

  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ PENDING  │ ──▶  │CONFIRMED │ ──▶  │COMPLETED │
  │  ⏳      │      │   ✅     │      │   🎉     │
  └──────────┘      └──────────┘      └──────────┘
       │                 │
       │                 │
       ▼                 ▼
  ┌──────────┐      ┌──────────┐
  │CANCELLED │      │CANCELLED │
  │  ❌      │      │   ❌     │
  └──────────┘      └──────────┘
```

### Azioni Provider su Prenotazione

```tsx
// ProviderDashboard.tsx
const BookingActions: React.FC<{ booking: Booking }> = ({ booking }) => {
  const handleConfirm = async () => {
    await api.put(`/bookings/${booking.id}/status`, { status: "confirmed" });
    // Notifica al cliente
    showToast({ type: "success", message: "Prenotazione confermata!" });
  };

  const handleComplete = async () => {
    await api.put(`/bookings/${booking.id}/status`, { status: "completed" });
    // Trigger rilascio pagamento escrow
  };

  const handleCancel = async (reason: string) => {
    await api.put(`/bookings/${booking.id}/status`, {
      status: "cancelled",
      reason,
    });
    // Trigger rimborso automatico
  };

  return (
    <div className="booking-actions">
      {booking.status === "pending" && (
        <>
          <button onClick={handleConfirm} className="btn-confirm">
            ✓ Conferma
          </button>
          <button onClick={() => showCancelModal()} className="btn-cancel">
            ✕ Rifiuta
          </button>
        </>
      )}

      {booking.status === "confirmed" && (
        <>
          <button onClick={handleComplete} className="btn-complete">
            🎉 Completato
          </button>
          <button onClick={openChat} className="btn-chat">
            💬 Messaggio
          </button>
        </>
      )}
    </div>
  );
};
```

### 3. Calendario Provider

```tsx
// Vista calendario settimanale/mensile delle prenotazioni
const ProviderCalendar: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [view, setView] = useState<"week" | "month">("week");

  // Colori per stato
  const statusColors = {
    pending: "#f59e0b", // Arancione
    confirmed: "#22c55e", // Verde
    completed: "#3b82f6", // Blu
    cancelled: "#ef4444", // Rosso
  };

  return (
    <div className="provider-calendar">
      <div className="calendar-header">
        <h3>Il Mio Calendario</h3>
        <div className="view-toggle">
          <button
            className={view === "week" ? "active" : ""}
            onClick={() => setView("week")}
          >
            Settimana
          </button>
          <button
            className={view === "month" ? "active" : ""}
            onClick={() => setView("month")}
          >
            Mese
          </button>
        </div>
      </div>

      <CalendarGrid
        bookings={bookings}
        view={view}
        statusColors={statusColors}
        onBookingClick={handleBookingClick}
      />
    </div>
  );
};
```

### 4. Guadagni e Pagamenti

```
╔═══════════════════════════════════════════════════════════════╗
║                    SEZIONE GUADAGNI                           ║
╚═══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│  RIEPILOGO GUADAGNI                                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📈 Grafico Guadagni (ultimi 6 mesi)                    │   │
│  │                                                          │   │
│  │  €2000 ┤                              ╭──╮              │   │
│  │  €1500 ┤                    ╭──╮  ╭──╯  │              │   │
│  │  €1000 ┤          ╭──╮  ╭──╯  ╰──╯      ╰──            │   │
│  │   €500 ┤  ╭──╮╭──╯  ╰──╯                               │   │
│  │      0 ┼──╯  ╰──────────────────────────────────       │   │
│  │         Giu  Lug  Ago  Set  Ott  Nov                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  TRANSAZIONI RECENTI                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 26 Nov │ Pulizia Casa - Mario R. │ +€75.00  │ 💳 Pagato │   │
│  │ 25 Nov │ Pulizia Uff. - Anna V.  │ +€120.00 │ 💳 Pagato │   │
│  │ 24 Nov │ Commissione piattaforma │ -€9.75   │ 📤 Prelievo│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  PAGAMENTI IN ESCROW (in attesa completamento)                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • €50.00 - Prenotazione #123 (scade 28 Nov)             │   │
│  │ • €75.00 - Prenotazione #124 (scade 29 Nov)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [    Configura Pagamenti Stripe    ]                          │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Gestione Disponibilità

```tsx
// AvailabilityManager.tsx
const AvailabilityManager: React.FC<{ serviceId: string }> = ({
  serviceId,
}) => {
  const days = [
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
    "Domenica",
  ];
  const [availability, setAvailability] = useState<DayAvailability[]>([]);

  return (
    <div className="availability-manager">
      <h3>Gestisci Disponibilità</h3>

      {days.map((day, index) => {
        const dayData = availability.find((a) => a.day === index + 1);

        return (
          <div key={day} className="day-row">
            <div className="day-toggle">
              <Switch
                checked={dayData?.enabled ?? false}
                onChange={(enabled) => updateDay(index + 1, { enabled })}
              />
              <span>{day}</span>
            </div>

            {dayData?.enabled && (
              <div className="time-range">
                <TimePicker
                  value={dayData.startTime}
                  onChange={(time) => updateDay(index + 1, { startTime: time })}
                />
                <span>-</span>
                <TimePicker
                  value={dayData.endTime}
                  onChange={(time) => updateDay(index + 1, { endTime: time })}
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="exceptions">
        <h4>Eccezioni</h4>
        <button onClick={() => setShowBlockModal(true)}>
          + Blocca Date Specifiche
        </button>
        {/* Lista date bloccate */}
      </div>
    </div>
  );
};
```

## API Dashboard Provider

| Metodo | Endpoint                   | Descrizione                 |
| ------ | -------------------------- | --------------------------- |
| GET    | `/api/provider/stats`      | Statistiche generali        |
| GET    | `/api/provider/bookings`   | Lista prenotazioni          |
| GET    | `/api/provider/earnings`   | Storico guadagni            |
| GET    | `/api/provider/reviews`    | Recensioni ricevute         |
| PUT    | `/api/bookings/:id/status` | Aggiorna stato prenotazione |
| POST   | `/api/services`            | Crea nuovo servizio         |
| PUT    | `/api/services/:id`        | Modifica servizio           |
| DELETE | `/api/services/:id`        | Elimina servizio            |

## Componente Principale

```tsx
// src-react/components/ProviderDashboard.tsx
const ProviderDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "bookings" | "services" | "earnings"
  >("overview");
  const [stats, setStats] = useState<ProviderStats | null>(null);

  return (
    <div className="provider-dashboard">
      <aside className="sidebar">
        <nav>
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            📊 Panoramica
          </button>
          <button
            className={activeTab === "bookings" ? "active" : ""}
            onClick={() => setActiveTab("bookings")}
          >
            📅 Prenotazioni
          </button>
          <button
            className={activeTab === "services" ? "active" : ""}
            onClick={() => setActiveTab("services")}
          >
            🔧 I Miei Servizi
          </button>
          <button
            className={activeTab === "earnings" ? "active" : ""}
            onClick={() => setActiveTab("earnings")}
          >
            💰 Guadagni
          </button>
        </nav>
      </aside>

      <main className="content">
        {activeTab === "overview" && <OverviewTab stats={stats} />}
        {activeTab === "bookings" && <BookingsTab />}
        {activeTab === "services" && <ServicesTab />}
        {activeTab === "earnings" && <EarningsTab />}
      </main>
    </div>
  );
};
```

## Notifiche Push Provider

Eventi che generano notifiche immediate:

- 🔔 **Nuova prenotazione ricevuta**
- 💬 **Nuovo messaggio da cliente**
- ❌ **Prenotazione cancellata**
- ⭐ **Nuova recensione ricevuta**
- 💰 **Pagamento rilasciato**
