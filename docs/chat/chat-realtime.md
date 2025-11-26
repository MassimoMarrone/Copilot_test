# 💬 Chat Real-time

## Panoramica

Il sistema di chat permette comunicazione istantanea tra clienti e fornitori utilizzando Socket.IO.

## Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                   ARCHITETTURA CHAT                              │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐                                      ┌──────────┐
  │ CLIENTE  │                                      │FORNITORE │
  │ Browser  │                                      │ Browser  │
  └────┬─────┘                                      └────┬─────┘
       │                                                 │
       │ WebSocket                             WebSocket │
       │                                                 │
       ▼                                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                      SOCKET.IO SERVER                        │
  │                                                              │
  │   ┌─────────────────────────────────────────────────────┐   │
  │   │  Room: conversation_abc123                          │   │
  │   │  - Client socket: user_1                            │   │
  │   │  - Provider socket: user_2                          │   │
  │   └─────────────────────────────────────────────────────┘   │
  │                                                              │
  └──────────────────────────┬──────────────────────────────────┘
                             │
                             │ Persist
                             ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   - Message     │
                    │   - Conversation│
                    └─────────────────┘
```

## Flusso Messaggi

```
┌─────────────────────────────────────────────────────────────────┐
│                   INVIO MESSAGGIO                                │
└─────────────────────────────────────────────────────────────────┘

CLIENTE                    SERVER                    FORNITORE
   │                          │                          │
   │  1. emit('sendMessage')  │                          │
   │─────────────────────────▶│                          │
   │  { to: providerId,       │                          │
   │    content: "Ciao!" }    │                          │
   │                          │                          │
   │                    ┌─────┴─────┐                    │
   │                    │ 2. Valida │                    │
   │                    │   utente  │                    │
   │                    └─────┬─────┘                    │
   │                          │                          │
   │                    ┌─────┴─────┐                    │
   │                    │ 3. Salva  │                    │
   │                    │   in DB   │                    │
   │                    └─────┬─────┘                    │
   │                          │                          │
   │                          │  4. emit('newMessage')   │
   │                          │─────────────────────────▶│
   │                          │  { from: clientId,       │
   │                          │    content: "Ciao!" }    │
   │                          │                          │
   │  5. emit('messageSent')  │                          │
   │◀─────────────────────────│                          │
   │  (conferma)              │                          │
   │                          │                          │
   │                          │  6. Aggiorna badge       │
   │                          │     messaggi non letti   │
   ▼                          ▼                          ▼
```

## Eventi Socket.IO

### Client → Server

| Evento         | Payload                        | Descrizione                |
| -------------- | ------------------------------ | -------------------------- |
| `authenticate` | `{ token }`                    | Autentica connessione      |
| `joinRoom`     | `{ conversationId }`           | Entra in una conversazione |
| `leaveRoom`    | `{ conversationId }`           | Esce dalla conversazione   |
| `sendMessage`  | `{ to, content, bookingId? }`  | Invia messaggio            |
| `markAsRead`   | `{ conversationId }`           | Segna messaggi come letti  |
| `typing`       | `{ conversationId, isTyping }` | Indicatore digitazione     |

### Server → Client

| Evento          | Payload                      | Descrizione              |
| --------------- | ---------------------------- | ------------------------ |
| `authenticated` | `{ success, userId }`        | Conferma autenticazione  |
| `newMessage`    | `{ message }`                | Nuovo messaggio ricevuto |
| `messageSent`   | `{ messageId, timestamp }`   | Conferma invio           |
| `messagesRead`  | `{ conversationId, readBy }` | Notifica lettura         |
| `userTyping`    | `{ userId, isTyping }`       | Utente sta scrivendo     |
| `error`         | `{ message }`                | Errore                   |

## Implementazione Server

```typescript
// src/socket.ts
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./server";

export function setupSocket(io: Server) {
  // Middleware autenticazione
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user.userId;
    console.log(`User connected: ${userId}`);

    // Join user's personal room
    socket.join(`user_${userId}`);

    // Handle join conversation room
    socket.on("joinRoom", ({ conversationId }) => {
      socket.join(`conversation_${conversationId}`);
    });

    // Handle send message
    socket.on("sendMessage", async ({ to, content, bookingId }) => {
      try {
        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            OR: [
              { participant1Id: userId, participant2Id: to },
              { participant1Id: to, participant2Id: userId },
            ],
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              participant1Id: userId,
              participant2Id: to,
              bookingId,
            },
          });
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: userId,
            content,
          },
        });

        // Emit to recipient
        io.to(`user_${to}`).emit("newMessage", {
          message,
          conversationId: conversation.id,
        });

        // Confirm to sender
        socket.emit("messageSent", {
          messageId: message.id,
          timestamp: message.createdAt,
        });
      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle mark as read
    socket.on("markAsRead", async ({ conversationId }) => {
      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          read: false,
        },
        data: { read: true },
      });

      // Notify other participant
      socket.to(`conversation_${conversationId}`).emit("messagesRead", {
        conversationId,
        readBy: userId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
    });
  });
}
```

## Implementazione Client

```typescript
// src-react/services/socketService.ts
import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
    });

    this.socket.on("connect", () => {
      console.log("Socket connected");
    });

    this.socket.on("newMessage", (data) => {
      // Aggiorna UI con nuovo messaggio
      this.onNewMessage?.(data);
    });
  }

  sendMessage(to: string, content: string, bookingId?: string) {
    this.socket?.emit("sendMessage", { to, content, bookingId });
  }

  joinConversation(conversationId: string) {
    this.socket?.emit("joinRoom", { conversationId });
  }

  markAsRead(conversationId: string) {
    this.socket?.emit("markAsRead", { conversationId });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  // Callback per nuovi messaggi
  onNewMessage?: (data: any) => void;
}

export const socketService = new SocketService();
```

## Schema Database

```prisma
model Conversation {
  id             String    @id @default(cuid())
  participant1Id String
  participant2Id String
  bookingId      String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  participant1   User      @relation("ConversationParticipant1")
  participant2   User      @relation("ConversationParticipant2")
  booking        Booking?
  messages       Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  senderId       String
  content        String
  read           Boolean      @default(false)
  createdAt      DateTime     @default(now())

  conversation   Conversation @relation(fields: [conversationId])
  sender         User         @relation(fields: [senderId])
}
```

## Componente ChatModal

```tsx
// src-react/components/ChatModal.tsx
const ChatModal: React.FC<Props> = ({ recipientId, bookingId, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    // Carica storico messaggi
    loadMessages();

    // Setup socket listener
    socketService.onNewMessage = (data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    return () => {
      socketService.onNewMessage = undefined;
    };
  }, []);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    socketService.sendMessage(recipientId, newMessage, bookingId);
    setNewMessage("");
  };

  return (
    <div className="chat-modal">
      <div className="chat-header">
        <h3>Chat con {recipientName}</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={msg.senderId === myId ? "sent" : "received"}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend}>Invia</button>
      </div>
    </div>
  );
};
```

## Contatore Messaggi Non Letti

```typescript
// API: GET /api/chat/unread-count
const unreadCount = await prisma.message.count({
  where: {
    conversation: {
      OR: [{ participant1Id: userId }, { participant2Id: userId }],
    },
    senderId: { not: userId },
    read: false,
  },
});

// Mostrato nella Navbar
<Link to="/messages">
  Messaggi
  {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
</Link>;
```

## Performance

- ✅ **Room-based**: Messaggi inviati solo ai partecipanti
- ✅ **Lazy loading**: Storico caricato a pagine
- ✅ **Debounce typing**: Indicatore ottimizzato
- ✅ **Reconnection**: Auto-riconnessione su disconnect
