# ⏱️ Calcolo Durata e Prezzo

## Panoramica

Il sistema calcola automaticamente la durata del servizio e il prezzo finale basandosi sulle caratteristiche dell'appartamento e la tariffa oraria del fornitore.

## Formula di Calcolo

```
┌─────────────────────────────────────────────────────────────────┐
│                    FORMULA DURATA                                │
│                                                                  │
│   Durata Totale = Durata Base (m²) + Extra Finestre             │
│                                                                  │
│   Esempio:                                                       │
│   Appartamento 50-80m² con 1-4 finestre                         │
│   = 180 min (base) + 30 min (finestre)                          │
│   = 210 minuti = 3h 30min                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FORMULA PREZZO                                │
│                                                                  │
│   Prezzo = Tariffa Oraria × (Durata in minuti / 60)            │
│                                                                  │
│   Esempio:                                                       │
│   Tariffa: €15/ora, Durata: 210 min                             │
│   = €15 × (210 / 60)                                            │
│   = €15 × 3.5                                                   │
│   = €52.50                                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Tabelle di Riferimento

### Durata Base per Metratura

| Range     | Descrizione         | Durata Base     | Motivazione                   |
| --------- | ------------------- | --------------- | ----------------------------- |
| 0-50 m²   | Monolocale/Studio   | 2 ore (120 min) | Spazi ridotti, pulizia veloce |
| 50-80 m²  | Bilocale            | 3 ore (180 min) | Standard medio                |
| 80-120 m² | Trilocale           | 4 ore (240 min) | Più stanze e bagni            |
| 120+ m²   | Grande appartamento | 5 ore (300 min) | Spazi ampi, più superfici     |

### Extra Tempo per Finestre

| Range Finestre | Tempo Extra      | Motivazione                |
| -------------- | ---------------- | -------------------------- |
| 0              | +0 min           | Nessuna finestra da pulire |
| 1-4            | +30 min          | Poche finestre standard    |
| 4-6            | +1 ora (60 min)  | Numero medio di finestre   |
| 6-10           | +2 ore (120 min) | Molte finestre/vetrate     |

## Flusso di Calcolo

```
┌─────────────────────────────────────────────────────────────────┐
│                   FLUSSO CALCOLO                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. INPUT UTENTE                                                │
│     - squareMetersRange: "50-80"                                │
│     - windowsCount: "1-4" (rappresentato come 2)                │
│     - serviceId: "abc123"                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. API CALL (Frontend → Backend)                               │
│     GET /api/scheduling/estimate-duration                       │
│     ?serviceId=abc123                                           │
│     &squareMetersRange=50-80                                    │
│     &windowsCount=2                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. BACKEND: Lookup Tabelle                                     │
│     baseDuration = SQUARE_METERS_DURATION["50-80"] → 180       │
│     windowsExtra = WINDOWS_TIME_ADJUSTMENT[2] → 30             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. CALCOLO DURATA                                              │
│     totalMinutes = 180 + 30 = 210                              │
│     totalMinutes = Math.max(60, totalMinutes) // Min 1 ora     │
│                                                                 │
│     hours = Math.floor(210 / 60) = 3                           │
│     remainingMinutes = 210 % 60 = 30                           │
│     formatted = "3h 30min"                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. FETCH SERVICE DATA                                          │
│     SELECT price, priceType FROM Service WHERE id = serviceId  │
│     → price: 15.00, priceType: "hourly"                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. CALCOLO PREZZO                                              │
│     switch(priceType):                                          │
│       case "hourly":                                            │
│         price = 15.00 × (210 / 60)                             │
│         price = 15.00 × 3.5                                    │
│         price = 52.50                                          │
│                                                                 │
│       case "fixed":                                             │
│         price = service.price (invariato)                      │
│                                                                 │
│       case "per_sqm":                                           │
│         avgSqm = getAverageSqm("50-80") → 65                   │
│         price = service.price × 65                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. RESPONSE                                                    │
│     {                                                           │
│       "minutes": 210,                                           │
│       "hours": 3.5,                                             │
│       "formatted": "3h 30min",                                  │
│       "price": 52.50                                           │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. FRONTEND: Display                                           │
│     ┌───────────────────────────────────────────┐              │
│     │  ⏱️ Durata stimata: 3h 30min              │              │
│     │  💰 Prezzo: €52.50                        │              │
│     └───────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Codice Implementazione

### Backend - schedulingService.ts

```typescript
const SQUARE_METERS_DURATION: Record<string, number> = {
  "0-50": 120,
  "50-80": 180,
  "80-120": 240,
  "120+": 300,
};

const WINDOWS_TIME_ADJUSTMENT: Record<number, number> = {
  0: 0,
  2: 30, // Rappresenta range "1-4"
  5: 60, // Rappresenta range "4-6"
  8: 120, // Rappresenta range "6-10"
};

function calculateEstimatedDuration(
  squareMetersRange: string,
  windowsCount: number
): EstimatedDuration {
  const baseDuration = SQUARE_METERS_DURATION[squareMetersRange] || 180;
  const windowsAdjustment = WINDOWS_TIME_ADJUSTMENT[windowsCount] || 0;

  const totalMinutes = Math.max(60, baseDuration + windowsAdjustment);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return {
    minutes: totalMinutes,
    hours: totalMinutes / 60,
    formatted:
      remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`,
  };
}

function calculatePrice(
  service: { price: number; priceType: string },
  estimatedMinutes: number,
  squareMetersRange: string
): number {
  switch (service.priceType) {
    case "hourly":
      return Math.round(service.price * (estimatedMinutes / 60) * 100) / 100;
    case "per_sqm":
      const avgSqm = getAverageSqm(squareMetersRange);
      return Math.round(service.price * avgSqm * 100) / 100;
    case "fixed":
    default:
      return service.price;
  }
}

function getAverageSqm(range: string): number {
  switch (range) {
    case "0-50":
      return 35;
    case "50-80":
      return 65;
    case "80-120":
      return 100;
    case "120+":
      return 150;
    default:
      return 65;
  }
}
```

### Frontend - SmartBookingForm.tsx

```typescript
// Calcolo locale (per preview immediata)
useEffect(() => {
  if (squareMetersRange && windowsCount !== undefined) {
    const duration = calculateLocalDuration(squareMetersRange, windowsCount);
    setEstimatedDuration(duration.formatted);
    setCalculatedPrice(service.price * duration.hours);
  }
}, [squareMetersRange, windowsCount]);

// Calcolo da API (per conferma)
const fetchEstimate = async () => {
  const response = await schedulingService.estimateDuration(
    service.id,
    squareMetersRange,
    windowsCount
  );
  setEstimatedDuration(response.formatted);
  setCalculatedPrice(response.price);
};
```

## Tipi di Prezzo Supportati

| Tipo      | Descrizione    | Formula             |
| --------- | -------------- | ------------------- |
| `hourly`  | Tariffa oraria | `price × hours`     |
| `fixed`   | Prezzo fisso   | `price` (invariato) |
| `per_sqm` | Prezzo al m²   | `price × avgSqm`    |

## Edge Cases

1. **Durata minima**: Mai meno di 1 ora (60 min)
2. **Range non valido**: Default a 180 min
3. **Finestre non specificate**: Default +0 min
4. **Prezzo troppo basso**: Minimo €0.50 (limite Stripe)

## Arrotondamento

```typescript
// Prezzo arrotondato a 2 decimali
price = Math.round(price * 100) / 100;

// Esempio: 52.499999 → 52.50
```
