# 🔔 Sistema Notifiche

## Panoramica

Il sistema di notifiche informa gli utenti di eventi importanti come nuove prenotazioni, messaggi, completamenti e aggiornamenti.

## Tipi di Notifiche

| Tipo      | Icona | Colore    | Esempio                    |
| --------- | ----- | --------- | -------------------------- |
| `success` | ✓     | Verde     | "Prenotazione confermata!" |
| `info`    | ℹ     | Blu       | "Hai un nuovo messaggio"   |
| `warning` | ⚠     | Arancione | "Prenotazione cancellata"  |
| `error`   | ✕     | Rosso     | "Pagamento fallito"        |

## Flusso Notifiche

```
┌─────────────────────────────────────────────────────────────────┐
│                   FLUSSO NOTIFICHE                               │
└─────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════╗
║  CREAZIONE NOTIFICA                                           ║
╚═══════════════════════════════════════════════════════════════╝

  ┌──────────────────┐
  │  EVENTO TRIGGER  │
  │  (es. booking    │
  │   completato)    │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  BACKEND: notificationService.createNotification({          │
  │    userId: "provider_123",                                   │
  │    title: "Nuova prenotazione!",                            │
  │    message: "Hai ricevuto una prenotazione per 27 Nov",     │
  │    type: "success"                                          │
  │  })                                                          │
  └──────────────────────────────────────────────────────────────┘
           │
           ├───────────────────────┐
           │                       │
           ▼                       ▼
  ┌─────────────────┐     ┌─────────────────┐
  │  SALVA IN DB    │     │  SOCKET.IO      │
  │  (persistenza)  │     │  (real-time)    │
  └─────────────────┘     └─────────────────┘
                                  │
                                  ▼
                          ┌─────────────────┐
                          │  io.to(userId)  │
                          │  .emit('notif') │
                          └─────────────────┘
                                  │
                                  ▼
╔═══════════════════════════════════════════════════════════════╗
║  FRONTEND: RICEZIONE                                          ║
╚═══════════════════════════════════════════════════════════════╝
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
           ▼                      ▼                      ▼
  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
  │  Badge Navbar   │   │ Toast Notifica  │   │ Notification    │
  │  +1 non lette   │   │ (popup 5 sec)   │   │ Center update   │
  └─────────────────┘   └─────────────────┘   └─────────────────┘
```

## Implementazione Backend

```typescript
// src/services/notificationService.ts
import { prisma } from "../server";
import { io } from "../socket";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  link?: string;
}

export const notificationService = {
  async createNotification(params: CreateNotificationParams) {
    // Salva nel database
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link,
        read: false,
      },
    });

    // Invia via Socket.IO se l'utente è online
    io.to(`user_${params.userId}`).emit("notification", notification);

    return notification;
  },

  async getNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  },
};
```

## Componente NotificationCenter

```tsx
// src-react/components/NotificationCenter.tsx
const NotificationCenter: React.FC<{ userId: string }> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();

    // Real-time listener
    socketService.onNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      // Mostra toast
      showToast(notification);
    };
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  return (
    <div className="notification-center">
      <button className="notification-bell" onClick={() => setIsOpen(!isOpen)}>
        <BellIcon />
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifiche</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead}>Segna tutte come lette</button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty">Nessuna notifica</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${!n.read ? "unread" : ""}`}
                  onClick={() => handleClick(n)}
                >
                  <NotificationIcon type={n.type} />
                  <div className="content">
                    <div className="title">{n.title}</div>
                    <div className="message">{n.message}</div>
                    <div className="time">{formatTime(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

## Eventi che Generano Notifiche

### Per il Cliente

| Evento                                 | Titolo                     | Tipo    |
| -------------------------------------- | -------------------------- | ------- |
| Prenotazione confermata                | "Prenotazione confermata!" | success |
| Servizio completato                    | "Servizio completato!"     | success |
| Nuovo messaggio                        | "Hai un nuovo messaggio"   | info    |
| Prenotazione cancellata (dal provider) | "Prenotazione cancellata"  | warning |

### Per il Fornitore

| Evento                                | Titolo                        | Tipo    |
| ------------------------------------- | ----------------------------- | ------- |
| Nuova prenotazione                    | "Nuova prenotazione!"         | success |
| Prenotazione cancellata (dal cliente) | "Prenotazione cancellata"     | warning |
| Nuovo messaggio                       | "Hai un nuovo messaggio"      | info    |
| Nuova recensione                      | "Hai ricevuto una recensione" | info    |

## Schema Database

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  type      String   @default("info") // success, info, warning, error
  read      Boolean  @default(false)
  link      String?  // URL opzionale per click
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId])
}
```

## Toast Notifications

```tsx
// src-react/components/ToastNotification.tsx
const ToastNotification: React.FC<Props> = ({ notification, onClose }) => {
  useEffect(() => {
    // Auto-close dopo 5 secondi
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast toast-${notification.type}`}>
      <div className="toast-icon">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="toast-content">
        <div className="toast-title">{notification.title}</div>
        <div className="toast-message">{notification.message}</div>
      </div>
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
};
```

## API Endpoints

| Metodo | Endpoint                      | Descrizione            |
| ------ | ----------------------------- | ---------------------- |
| GET    | `/api/notifications`          | Lista notifiche utente |
| PUT    | `/api/notifications/:id/read` | Segna come letta       |
| PUT    | `/api/notifications/read-all` | Segna tutte come lette |
| DELETE | `/api/notifications/:id`      | Elimina notifica       |

## Icone SVG per Tipo

```tsx
const NotificationIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case "success":
      return (
        <svg viewBox="0 0 24 24" stroke="#22c55e">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "error":
      return (
        <svg viewBox="0 0 24 24" stroke="#ef4444">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case "warning":
      return (
        <svg viewBox="0 0 24 24" stroke="#f59e0b">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "info":
    default:
      return (
        <svg viewBox="0 0 24 24" stroke="#3b82f6">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
};
```

## Format Tempo Relativo

```typescript
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Adesso";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m fa`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h fa`;
  return date.toLocaleDateString("it-IT");
}

// Output:
// "Adesso"
// "5m fa"
// "2h fa"
// "26/11/2025"
```
