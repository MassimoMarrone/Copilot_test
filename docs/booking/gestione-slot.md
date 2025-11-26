# 📅 Gestione Slot Orari

## Panoramica
Il sistema genera dinamicamente gli slot orari disponibili basandosi sull'orario di lavoro del fornitore e sulle prenotazioni esistenti.

## Flusso Logico

```
┌─────────────────────────────────────────────────────────────────┐
│                 GENERAZIONE SLOT DISPONIBILI                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. INPUT                                                       │
│     - serviceId: ID del servizio                                │
│     - date: "2025-11-27"                                        │
│     - requiredDuration: 210 minuti                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. FETCH CONFIGURAZIONE SERVIZIO                               │
│     SELECT workingHoursStart, workingHoursEnd,                  │
│            slotDurationMinutes, availability                    │
│     FROM Service WHERE id = serviceId                           │
│                                                                 │
│     Esempio:                                                    │
│     - workingHoursStart: "08:00"                               │
│     - workingHoursEnd: "18:00"                                 │
│     - slotDurationMinutes: 30                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. CHECK DISPONIBILITÀ GIORNALIERA                             │
│                                                                 │
│     A. Giorno bloccato?                                         │
│        if (blockedDates.includes("2025-11-27")) → return []    │
│                                                                 │
│     B. Giorno della settimana abilitato?                        │
│        dayName = "thursday"                                     │
│        if (!availability.weekly.thursday.enabled) → return []  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. FETCH PRENOTAZIONI ESISTENTI                                │
│     SELECT startTime, endTime FROM Booking                      │
│     WHERE serviceId = ? AND date = ?                            │
│       AND status != 'cancelled'                                 │
│                                                                 │
│     Esempio risultato:                                          │
│     [                                                           │
│       { startTime: "10:00", endTime: "12:00" },                │
│       { startTime: "15:00", endTime: "17:00" }                 │
│     ]                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. GENERAZIONE SLOT POTENZIALI                                 │
│                                                                 │
│     for (start = 08:00; start + duration <= 18:00; start += 30) │
│                                                                 │
│     Con duration=210min (3h30):                                 │
│     ┌────────────────────────────────────────────────────┐     │
│     │ 08:00-11:30 │ 08:30-12:00 │ 09:00-12:30 │ ...     │     │
│     │ 09:30-13:00 │ 10:00-13:30 │ 10:30-14:00 │ ...     │     │
│     │ 11:00-14:30 │ 11:30-15:00 │ 12:00-15:30 │ ...     │     │
│     │ 12:30-16:00 │ 13:00-16:30 │ 13:30-17:00 │ ...     │     │
│     │ 14:00-17:30 │ 14:30-18:00 │                       │     │
│     └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. CONTROLLO SOVRAPPOSIZIONI                                   │
│                                                                 │
│     Per ogni slot generato, verifica overlap con prenotazioni:  │
│                                                                 │
│     hasOverlap = existingBookings.some(booking => {            │
│       return slotStart < bookingEnd && slotEnd > bookingStart; │
│     });                                                         │
│                                                                 │
│     Esempio con booking 10:00-12:00:                           │
│     ┌─────────────────────────────────────────────────────┐    │
│     │ 08:00-11:30 → OVERLAP (11:30 > 10:00 && 08:00 < 12:00)│   │
│     │ 08:30-12:00 → OVERLAP                                │   │
│     │ 09:00-12:30 → OVERLAP                                │   │
│     │ 09:30-13:00 → OVERLAP                                │   │
│     │ 12:00-15:30 → OK (12:00 >= 12:00, no overlap)       │   │
│     │ 12:30-16:00 → OK                                     │   │
│     └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. FILTRA SOLO DISPONIBILI                                     │
│     slots.filter(slot => slot.available)                        │
│                                                                 │
│     Output finale (mostrato all'utente):                        │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│     │08:00-11:30│ │12:00-15:30│ │12:30-16:00│ ...              │
│     └──────────┘ └──────────┘ └──────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## Algoritmo di Overlap

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISUALIZZAZIONE OVERLAP                       │
└─────────────────────────────────────────────────────────────────┘

Timeline giornata (08:00 - 18:00):
═══════════════════════════════════════════════════════════════════

Prenotazione esistente:
        10:00          12:00
          │▓▓▓▓▓▓▓▓▓▓▓▓▓│
          │  OCCUPATO   │

Slot 08:00-11:30:
  08:00              11:30
    │░░░░░░░░░░░░░░░░░│
    │   OVERLAP!      │  ← slotEnd(11:30) > bookingStart(10:00)
                           && slotStart(08:00) < bookingEnd(12:00)

Slot 12:00-15:30:
                      12:00              15:30
                        │░░░░░░░░░░░░░░░░░│
                        │   DISPONIBILE   │  ← slotStart(12:00) >= bookingEnd(12:00)
                                              NO overlap!
```

## Codice Implementazione

```typescript
// src/services/schedulingService.ts

async getAvailableSlots(
  serviceId: string,
  date: string,
  requiredDurationMinutes: number
): Promise<TimeSlot[]> {
  
  // 1. Fetch service config
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  
  const workStart = service.workingHoursStart || "08:00";
  const workEnd = service.workingHoursEnd || "18:00";
  const slotDuration = service.slotDurationMinutes || 30;

  // 2. Fetch existing bookings
  const existingBookings = await prisma.booking.findMany({
    where: {
      serviceId,
      status: { not: "cancelled" },
      date: { /* same day filter */ }
    },
  });

  // 3. Generate slots
  const slots: TimeSlot[] = [];
  const workStartMinutes = timeToMinutes(workStart);
  const workEndMinutes = timeToMinutes(workEnd);

  for (
    let startMinutes = workStartMinutes;
    startMinutes + requiredDurationMinutes <= workEndMinutes;
    startMinutes += slotDuration
  ) {
    const endMinutes = startMinutes + requiredDurationMinutes;
    
    // 4. Check overlap
    const isAvailable = !existingBookings.some((booking) => {
      if (!booking.startTime || !booking.endTime) return true; // Legacy
      
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = timeToMinutes(booking.endTime);
      
      return startMinutes < bookingEnd && endMinutes > bookingStart;
    });

    slots.push({
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
      available: isAvailable,
    });
  }

  return slots;
}

// Helper functions
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}
```

## Validazione al Momento del Booking

```typescript
// Double-check prima di salvare (race condition protection)
async validateSlotAvailability(
  serviceId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  
  const existingBookings = await prisma.booking.findMany({
    where: {
      serviceId,
      status: { not: "cancelled" },
      date: { /* same day */ }
    },
  });

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  for (const booking of existingBookings) {
    if (!booking.startTime || !booking.endTime) return false;
    
    const existingStart = timeToMinutes(booking.startTime);
    const existingEnd = timeToMinutes(booking.endTime);
    
    if (newStart < existingEnd && newEnd > existingStart) {
      return false; // Overlap detected!
    }
  }

  return true;
}
```

## Configurazione Disponibilità Fornitore

```typescript
// Schema availability nel Service
interface Availability {
  weekly: {
    monday: { enabled: boolean; start?: string; end?: string };
    tuesday: { enabled: boolean; start?: string; end?: string };
    // ...
  };
  blockedDates: string[]; // ["2025-12-25", "2025-12-26"]
}

// Esempio
{
  "weekly": {
    "monday": { "enabled": true },
    "tuesday": { "enabled": true },
    "wednesday": { "enabled": true },
    "thursday": { "enabled": true },
    "friday": { "enabled": true },
    "saturday": { "enabled": false },
    "sunday": { "enabled": false }
  },
  "blockedDates": ["2025-12-25", "2025-12-31"]
}
```

## UX: Solo Slot Disponibili

```typescript
// Frontend - SmartBookingForm.tsx
{availableSlots
  .filter(slot => slot.available)  // ← Mostra SOLO disponibili
  .map((slot, index) => (
    <button
      key={index}
      className={`time-slot ${selectedSlot?.startTime === slot.startTime ? "selected" : ""}`}
      onClick={() => setSelectedSlot(slot)}
    >
      {slot.startTime} - {slot.endTime}
    </button>
  ))
}
```

## Edge Cases Gestiti

| Caso | Comportamento |
|------|---------------|
| Nessuno slot disponibile | Messaggio "Nessun orario disponibile per questa data" |
| Booking legacy (no startTime/endTime) | Blocca tutto il giorno |
| Giorno non lavorativo | Array vuoto |
| Data bloccata | Array vuoto |
| Race condition | Validazione server-side al momento del booking |
