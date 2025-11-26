# 👤 Dashboard Cliente

## Panoramica

La dashboard cliente permette agli utenti di gestire le proprie prenotazioni, visualizzare lo storico servizi, comunicare con i fornitori e lasciare recensioni.

## Struttura Dashboard

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  CLIENT DASHBOARD                                                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  👤 PROFILO UTENTE                                                  │ ║
║  │  ┌──────┐ Mario Rossi                                               │ ║
║  │  │ 🖼️  │ mario.rossi@email.com                                     │ ║
║  │  │      │ Membro da: Gennaio 2024                                   │ ║
║  │  └──────┘ 12 prenotazioni completate                                │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  📅 PROSSIME PRENOTAZIONI                                           │ ║
║  │  ┌───────────────────────────────────────────────────────────────┐ │ ║
║  │  │ 🧹 Pulizia Casa                                               │ │ ║
║  │  │ 📅 Mercoledì 27 Nov, 14:00-16:00                             │ │ ║
║  │  │ 👤 CleanPro Service - ⭐4.8                                   │ │ ║
║  │  │ 📍 Via Roma 10, Milano                                        │ │ ║
║  │  │ 💰 €50.00                                                     │ │ ║
║  │  │ [💬 Chat] [📄 Dettagli] [❌ Cancella]                        │ │ ║
║  │  └───────────────────────────────────────────────────────────────┘ │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  📜 STORICO SERVIZI                                                 │ ║
║  │  ┌─────────────────────────────────────────────────────────────┐   │ ║
║  │  │ ✅ 20 Nov │ Pulizia Casa │ €50.00 │ ⭐⭐⭐⭐⭐ Recensito     │   │ ║
║  │  │ ✅ 15 Nov │ Giardinaggio │ €80.00 │ [Lascia Recensione]    │   │ ║
║  │  │ ❌ 10 Nov │ Elettricista │ €0.00  │ Cancellato - Rimborsato │   │ ║
║  │  └─────────────────────────────────────────────────────────────┘   │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌────────────────────────────┐ ┌────────────────────────────────────┐   ║
║  │ 🔖 SERVIZI PREFERITI       │ │ 💬 CONVERSAZIONI                   │   ║
║  │ ├─ CleanPro Service       │ │ ├─ CleanPro: "Confermo per..."    │   ║
║  │ ├─ GiardinoTop            │ │ └─ ElettricaRapida: "Buongiorno..."│   ║
║  │ └─ IdraulicoExpress       │ │                                     │   ║
║  └────────────────────────────┘ └────────────────────────────────────┘   ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

## Componente Principale

```tsx
// src-react/components/ClientDashboard.tsx
const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "history" | "favorites"
  >("upcoming");

  useEffect(() => {
    loadBookings();
  }, []);

  const upcomingBookings = bookings.filter(
    (b) =>
      ["pending", "confirmed"].includes(b.status) &&
      new Date(b.date) >= new Date()
  );

  const pastBookings = bookings.filter(
    (b) => b.status === "completed" || new Date(b.date) < new Date()
  );

  return (
    <div className="client-dashboard">
      {/* Header Profilo */}
      <div className="profile-header">
        <img
          src={user?.avatar || "/default-avatar.png"}
          alt=""
          className="avatar"
        />
        <div className="info">
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
          <span className="member-since">
            Membro da {formatDate(user?.createdAt)}
          </span>
        </div>
        <button onClick={() => navigate("/profile")}>Modifica Profilo</button>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={activeTab === "upcoming" ? "active" : ""}
          onClick={() => setActiveTab("upcoming")}
        >
          Prossime ({upcomingBookings.length})
        </button>
        <button
          className={activeTab === "history" ? "active" : ""}
          onClick={() => setActiveTab("history")}
        >
          Storico
        </button>
        <button
          className={activeTab === "favorites" ? "active" : ""}
          onClick={() => setActiveTab("favorites")}
        >
          Preferiti
        </button>
      </div>

      {/* Contenuto Tab */}
      <div className="tab-content">
        {activeTab === "upcoming" && (
          <UpcomingBookings bookings={upcomingBookings} />
        )}
        {activeTab === "history" && <BookingHistory bookings={pastBookings} />}
        {activeTab === "favorites" && <FavoriteServices />}
      </div>
    </div>
  );
};
```

## Flusso Prenotazione Cliente

```
╔═══════════════════════════════════════════════════════════════╗
║                 CICLO VITA PRENOTAZIONE                       ║
╚═══════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────┐
│  1. RICERCA E SELEZIONE                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Cliente cerca "pulizie" a "Milano"                      │ │
│  │ → Visualizza risultati su mappa e lista                 │ │
│  │ → Seleziona servizio                                    │ │
│  │ → Apre form prenotazione intelligente                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  2. COMPILAZIONE PRENOTAZIONE                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Step 1: Seleziona data e fascia oraria                  │ │
│  │ Step 2: Inserisce dettagli (metratura, tipo servizio)   │ │
│  │ Step 3: Vede stima prezzo e conferma                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  3. PAGAMENTO                                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ → Redirect a Stripe Checkout                            │ │
│  │ → Pagamento trattenuto in escrow                        │ │
│  │ → Prenotazione creata con status "pending"              │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  4. ATTESA CONFERMA                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Status: ⏳ PENDING                                       │ │
│  │ • Notifica inviata al fornitore                         │ │
│  │ • Cliente può chattare con fornitore                    │ │
│  │ • Cliente può cancellare (rimborso completo)            │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│ FORNITORE CONFERMA      │   │ FORNITORE RIFIUTA       │
│ Status: ✅ CONFIRMED     │   │ Status: ❌ CANCELLED     │
│                         │   │                         │
│ • Notifica al cliente   │   │ • Rimborso automatico   │
│ • Appare nel calendario │   │ • Notifica al cliente   │
└─────────────────────────┘   └─────────────────────────┘
              │
              ▼
┌───────────────────────────────────────────────────────────────┐
│  5. SERVIZIO                                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • Il giorno concordato il fornitore esegue il servizio  │ │
│  │ • Comunicazione via chat                                │ │
│  │ • Fornitore marca come "completato"                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  6. COMPLETAMENTO                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Status: 🎉 COMPLETED                                     │ │
│  │ • Pagamento rilasciato al fornitore                     │ │
│  │ • Cliente invitato a lasciare recensione                │ │
│  │ • Prenotazione va nello storico                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Componente Card Prenotazione

```tsx
// BookingCard.tsx
const BookingCard: React.FC<{ booking: Booking }> = ({ booking }) => {
  const [showChat, setShowChat] = useState(false);

  const statusConfig = {
    pending: { label: "In attesa", color: "#f59e0b", icon: "⏳" },
    confirmed: { label: "Confermata", color: "#22c55e", icon: "✅" },
    completed: { label: "Completata", color: "#3b82f6", icon: "🎉" },
    cancelled: { label: "Cancellata", color: "#ef4444", icon: "❌" },
  };

  const status = statusConfig[booking.status];

  return (
    <div className="booking-card">
      <div className="booking-header">
        <img src={booking.service.images[0]} alt="" />
        <div>
          <h4>{booking.service.name}</h4>
          <p className="provider-name">
            {booking.service.provider.name} • ⭐{booking.service.rating}
          </p>
        </div>
        <span
          className="status-badge"
          style={{ backgroundColor: status.color }}
        >
          {status.icon} {status.label}
        </span>
      </div>

      <div className="booking-details">
        <div className="detail">
          <span className="icon">📅</span>
          <span>
            {formatDate(booking.date)}, {booking.timeSlot}
          </span>
        </div>
        <div className="detail">
          <span className="icon">📍</span>
          <span>{booking.address}</span>
        </div>
        <div className="detail">
          <span className="icon">⏱️</span>
          <span>{booking.duration} minuti</span>
        </div>
        <div className="detail">
          <span className="icon">💰</span>
          <span>€{booking.totalPrice.toFixed(2)}</span>
        </div>
      </div>

      <div className="booking-actions">
        <button onClick={() => setShowChat(true)} className="btn-chat">
          💬 Chat
        </button>

        {["pending", "confirmed"].includes(booking.status) && (
          <button
            onClick={() => cancelBooking(booking.id)}
            className="btn-cancel"
          >
            ❌ Cancella
          </button>
        )}

        {booking.status === "completed" && !booking.hasReview && (
          <button
            onClick={() => openReviewModal(booking)}
            className="btn-review"
          >
            ⭐ Recensisci
          </button>
        )}
      </div>

      {showChat && (
        <ChatModal booking={booking} onClose={() => setShowChat(false)} />
      )}
    </div>
  );
};
```

## Sistema Preferiti

```tsx
// FavoriteServices.tsx
const FavoriteServices: React.FC = () => {
  const [favorites, setFavorites] = useState<Service[]>([]);

  const toggleFavorite = async (serviceId: string) => {
    const isFav = favorites.some((f) => f.id === serviceId);

    if (isFav) {
      await api.delete(`/favorites/${serviceId}`);
      setFavorites(favorites.filter((f) => f.id !== serviceId));
    } else {
      await api.post(`/favorites/${serviceId}`);
      // Ricarica lista
    }
  };

  return (
    <div className="favorites-grid">
      {favorites.length === 0 ? (
        <div className="empty-state">
          <p>Non hai ancora servizi preferiti</p>
          <button onClick={() => navigate("/search")}>Cerca Servizi</button>
        </div>
      ) : (
        favorites.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isFavorite={true}
            onFavoriteToggle={() => toggleFavorite(service.id)}
          />
        ))
      )}
    </div>
  );
};
```

## API Dashboard Cliente

| Metodo | Endpoint                    | Descrizione                |
| ------ | --------------------------- | -------------------------- |
| GET    | `/api/bookings`             | Lista prenotazioni cliente |
| GET    | `/api/bookings/:id`         | Dettaglio prenotazione     |
| DELETE | `/api/bookings/:id`         | Cancella prenotazione      |
| GET    | `/api/favorites`            | Lista servizi preferiti    |
| POST   | `/api/favorites/:serviceId` | Aggiungi preferito         |
| DELETE | `/api/favorites/:serviceId` | Rimuovi preferito          |
| POST   | `/api/reviews`              | Crea recensione            |
| GET    | `/api/user/profile`         | Profilo utente             |
| PUT    | `/api/user/profile`         | Aggiorna profilo           |

## Cancellazione Prenotazione

```tsx
const cancelBooking = async (bookingId: string) => {
  const confirmed = await showConfirmDialog({
    title: "Cancella Prenotazione",
    message:
      "Sei sicuro di voler cancellare questa prenotazione? Riceverai un rimborso completo.",
    confirmText: "Sì, cancella",
    cancelText: "No, mantieni",
  });

  if (confirmed) {
    try {
      await api.delete(`/bookings/${bookingId}`);
      showToast({
        type: "success",
        message: "Prenotazione cancellata. Rimborso in elaborazione.",
      });
      loadBookings(); // Ricarica lista
    } catch (error) {
      showToast({ type: "error", message: "Errore durante la cancellazione" });
    }
  }
};
```

## Notifiche Cliente

Eventi che generano notifiche:

- ✅ **Prenotazione confermata dal fornitore**
- ❌ **Prenotazione rifiutata dal fornitore**
- 💬 **Nuovo messaggio dal fornitore**
- 🎉 **Servizio completato - lascia una recensione**
- 💰 **Rimborso elaborato**
