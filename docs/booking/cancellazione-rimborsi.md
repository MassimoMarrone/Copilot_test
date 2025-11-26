# ❌ Cancellazione e Rimborsi

## Panoramica
Il sistema gestisce automaticamente la cancellazione delle prenotazioni e il rimborso al cliente tramite Stripe.

## Flusso Cancellazione

```
┌─────────────────────────────────────────────────────────────────┐
│                   CANCELLAZIONE PRENOTAZIONE                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. FRONTEND: Cliente clicca "Cancella Prenotazione"            │
│     - Modal di conferma                                         │
│     - "Sei sicuro? Il rimborso sarà automatico"                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. API CALL: PUT /api/bookings/:id/cancel                      │
│     Headers: Authorization: Bearer <token>                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. BACKEND: Verifica autorizzazione                            │
│     - Booking appartiene all'utente?                            │
│     - Stato = "pending" o "confirmed"?                          │
│     - Data servizio non già passata?                            │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       [Non autorizzato]               [Autorizzato]
              │                               │
              ▼                               ▼
┌─────────────────────┐         ┌─────────────────────────────────┐
│ Return Error 403    │         │  4. CHECK PAGAMENTO             │
│ "Non puoi cancellare│         │     Booking ha paymentIntentId? │
└─────────────────────┘         └─────────────────────────────────┘
                                              │
                                ┌─────────────┴─────────────┐
                                ▼                           ▼
                         [No payment]              [Ha paymentIntentId]
                                │                           │
                                ▼                           ▼
                  ┌─────────────────────┐   ┌─────────────────────────┐
                  │ Solo update status  │   │  5. RICHIEDI RIMBORSO   │
                  │ → "cancelled"       │   │     Stripe API          │
                  └─────────────────────┘   └─────────────────────────┘
                                                        │
                                                        ▼
                                          ┌─────────────────────────┐
                                          │  stripe.refunds.create({│
                                          │    payment_intent: id   │
                                          │  })                     │
                                          └─────────────────────────┘
                                                        │
                                          ┌─────────────┴─────────────┐
                                          ▼                           ▼
                                   [Rimborso OK]              [Rimborso Failed]
                                          │                           │
                                          ▼                           ▼
                          ┌─────────────────────┐   ┌─────────────────────────┐
                          │  6. UPDATE BOOKING  │   │ Log error               │
                          │     status: cancelled│   │ Update status anyway   │
                          │     refundId: ref_xxx│   │ Notify admin           │
                          └─────────────────────┘   └─────────────────────────┘
                                          │
                                          ▼
                          ┌─────────────────────────────────────────┐
                          │  7. NOTIFICHE                           │
                          │     - Email al cliente (conferma)      │
                          │     - Notifica al fornitore            │
                          │     - Log transazione                  │
                          └─────────────────────────────────────────┘
                                          │
                                          ▼
                          ┌─────────────────────────────────────────┐
                          │  8. RESPONSE                            │
                          │     {                                   │
                          │       success: true,                    │
                          │       message: "Prenotazione cancellata│
                          │                 con rimborso",         │
                          │       refundId: "ref_xxx"              │
                          │     }                                   │
                          └─────────────────────────────────────────┘
```

## Codice Implementazione

### Backend - bookingService.ts

```typescript
async cancelBooking(bookingId: string, userId: string): Promise<Booking> {
  // 1. Fetch booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true }
  });

  if (!booking) {
    throw new Error("Prenotazione non trovata");
  }

  // 2. Verifica autorizzazione
  if (booking.userId !== userId) {
    throw new Error("Non autorizzato a cancellare questa prenotazione");
  }

  // 3. Verifica stato
  if (booking.status === "cancelled") {
    throw new Error("Prenotazione già cancellata");
  }

  if (booking.status === "completed") {
    throw new Error("Non puoi cancellare una prenotazione completata");
  }

  // 4. Processo rimborso se c'è un pagamento
  let refundId: string | null = null;
  
  if (booking.paymentIntentId) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: booking.paymentIntentId,
      });
      refundId = refund.id;
      console.log(`Rimborso creato: ${refundId}`);
    } catch (error) {
      console.error("Errore durante il rimborso:", error);
      // Continua comunque con la cancellazione
    }
  }

  // 5. Update booking
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "cancelled",
      refundId: refundId,
      cancelledAt: new Date(),
    },
  });

  // 6. Notifica fornitore
  await notificationService.createNotification({
    userId: booking.service.providerId,
    title: "Prenotazione cancellata",
    message: `Una prenotazione per ${booking.service.title} è stata cancellata`,
    type: "warning",
  });

  return updatedBooking;
}
```

### Frontend - bookingService.ts

```typescript
async cancelBooking(bookingId: string): Promise<void> {
  const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
    method: "PUT",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Errore durante la cancellazione");
  }
}
```

### UI Component

```tsx
// ClientDashboard.tsx
const handleCancelBooking = async (bookingId: string) => {
  if (!confirm("Sei sicuro di voler cancellare questa prenotazione? Il rimborso sarà automatico.")) {
    return;
  }

  try {
    await bookingService.cancelBooking(bookingId);
    toast.success("Prenotazione cancellata con successo! Il rimborso è in elaborazione.");
    loadBookings(); // Refresh lista
  } catch (error) {
    toast.error(error.message);
  }
};

// Bottone cancella (solo per prenotazioni pending/confirmed)
{booking.status === "pending" || booking.status === "confirmed" ? (
  <button 
    onClick={() => handleCancelBooking(booking.id)}
    className="btn-cancel"
  >
    Cancella
  </button>
) : null}
```

## Stati Prenotazione

```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO DI VITA BOOKING                         │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌───────────┐     ┌───────────┐
  │ PENDING  │────▶│ CONFIRMED │────▶│ COMPLETED │
  └──────────┘     └───────────┘     └───────────┘
       │                │
       │                │
       ▼                ▼
  ┌──────────────────────┐
  │      CANCELLED       │
  │  (con rimborso auto) │
  └──────────────────────┘
```

| Stato | Descrizione | Cancellabile | Rimborso |
|-------|-------------|--------------|----------|
| `pending` | In attesa conferma fornitore | ✅ Sì | ✅ 100% |
| `confirmed` | Confermato dal fornitore | ✅ Sì | ✅ 100% |
| `completed` | Servizio completato | ❌ No | ❌ No |
| `cancelled` | Cancellato | ❌ Già cancellato | - |

## Stripe Refund API

```typescript
// Rimborso completo
const refund = await stripe.refunds.create({
  payment_intent: "pi_xxx",
});

// Rimborso parziale (futuro)
const refund = await stripe.refunds.create({
  payment_intent: "pi_xxx",
  amount: 5000, // €50.00 in centesimi
});
```

## Tempi di Rimborso

| Metodo Pagamento | Tempo Stimato |
|------------------|---------------|
| Carta di credito | 5-10 giorni lavorativi |
| Carta di debito | 5-10 giorni lavorativi |
| SEPA | 5-8 giorni lavorativi |

## Policy di Cancellazione (Futura)

```
┌─────────────────────────────────────────────────────────────────┐
│              POLICY CANCELLAZIONE (Da implementare)              │
└─────────────────────────────────────────────────────────────────┘

Tempo prima del servizio    │    Rimborso
───────────────────────────────────────────
> 48 ore                    │    100%
24-48 ore                   │    50%
< 24 ore                    │    0% (o credito)
```

## Logging e Audit

```typescript
// Log transazione per audit
await prisma.transactionLog.create({
  data: {
    type: "REFUND",
    bookingId: booking.id,
    userId: userId,
    amount: booking.totalAmount,
    stripeRefundId: refundId,
    timestamp: new Date(),
    metadata: {
      reason: "customer_requested",
      originalPaymentIntent: booking.paymentIntentId,
    }
  }
});
```

## Error Handling

| Errore Stripe | Azione |
|---------------|--------|
| `charge_already_refunded` | Ignora, già rimborsato |
| `insufficient_funds` | Notifica admin |
| `expired_or_canceled_card` | Notifica cliente via email |
