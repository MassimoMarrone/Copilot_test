# 🔧 Gestione Servizi

## Panoramica
I fornitori possono creare, modificare e gestire i propri servizi attraverso il sistema di gestione servizi.

## Struttura Servizio

```typescript
interface Service {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  subcategory: string;
  price: number;           // Prezzo base per ora
  duration: number;        // Durata minima in minuti
  images: string[];        // URL immagini
  providerId: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    maxDistance: number;   // Raggio copertura in km
  };
  availability: DayAvailability[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
}

type ServiceCategory = 
  | "pulizie"
  | "giardinaggio"
  | "idraulica"
  | "elettricista"
  | "traslochi"
  | "imbianchino"
  | "altro";
```

## Flusso Creazione Servizio

```
╔═══════════════════════════════════════════════════════════════╗
║                  CREAZIONE NUOVO SERVIZIO                     ║
╚═══════════════════════════════════════════════════════════════╝

┌─────────────────┐
│  STEP 1         │
│  Info Base      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  • Nome servizio                                        │
│  • Descrizione dettagliata                              │
│  • Categoria (dropdown)                                 │
│  • Sottocategoria                                       │
│  • Prezzo orario                                        │
│  • Durata minima                                        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  STEP 2         │
│  Localizzazione │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  • Indirizzo base (autocomplete Google)                 │
│  • Raggio di copertura (slider km)                      │
│  • Mappa preview con area servita                       │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  STEP 3         │
│  Disponibilità  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Per ogni giorno della settimana:                       │
│  • Toggle attivo/disattivo                              │
│  • Fascia oraria inizio                                 │
│  • Fascia oraria fine                                   │
│  • Pausa pranzo (opzionale)                             │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  STEP 4         │
│  Immagini       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  • Upload fino a 5 immagini                             │
│  • Drag & drop supportato                               │
│  • Preview con opzione elimina                          │
│  • Prima immagine = copertina                           │
└─────────────────────────────────────────────────────────┘
         │
         ▼
╔═══════════════════════════════════════════════════════════════╗
║  VALIDAZIONE & SALVATAGGIO                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  ✓ Tutti i campi obbligatori compilati                        ║
║  ✓ Prezzo > 0                                                 ║
║  ✓ Almeno 1 giorno con disponibilità                          ║
║  ✓ Almeno 1 immagine                                          ║
╚═══════════════════════════════════════════════════════════════╝
         │
         ▼
    ┌────────────────────┐
    │  ✅ SERVIZIO ATTIVO │
    │  Visibile nella    │
    │  ricerca           │
    └────────────────────┘
```

## API Servizi

### Creare Servizio
```http
POST /api/services
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "name": "Pulizie Professionali",
  "description": "Servizio completo di pulizia domestica...",
  "category": "pulizie",
  "subcategory": "casa",
  "price": 25,
  "duration": 60,
  "location": {
    "address": "Via Roma 1, Milano",
    "lat": 45.4642,
    "lng": 9.1900,
    "maxDistance": 15
  },
  "availability": [
    { "day": 1, "enabled": true, "start": "08:00", "end": "18:00" },
    { "day": 2, "enabled": true, "start": "08:00", "end": "18:00" }
  ],
  "images": [File, File, ...]
}
```

### Lista Servizi Propri
```http
GET /api/services/my-services
Authorization: Bearer <token>

Response:
{
  "services": [
    {
      "id": "srv_abc123",
      "name": "Pulizie Professionali",
      "isActive": true,
      "rating": 4.8,
      "reviewCount": 24,
      "bookingsThisMonth": 12,
      "earnings": 360
    }
  ]
}
```

### Modifica Servizio
```http
PUT /api/services/:id
Authorization: Bearer <token>

{
  "price": 30,
  "isActive": false
}
```

### Elimina Servizio
```http
DELETE /api/services/:id
Authorization: Bearer <token>
```

## Ricerca Servizi

```
╔═══════════════════════════════════════════════════════════════╗
║                    RICERCA SERVIZI                            ║
╚═══════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────┐
│  INPUT RICERCA                                                │
├───────────────────────────────────────────────────────────────┤
│  🔍 Cosa cerchi?          │ 📍 Dove?                         │
│  [pulizie            ]    │ [Milano              ]           │
│                           │                                   │
│  Categoria: [Tutte ▾]     │ Raggio: [10 km ▾]                │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  FILTRI APPLICATI                                             │
├───────────────────────────────────────────────────────────────┤
│  • Query testuale: fuzzy search su nome e descrizione         │
│  • Geolocalizzazione: ST_DWithin(location, punto, raggio)     │
│  • Categoria: match esatto se selezionata                     │
│  • Disponibilità: servizi con slot liberi                     │
│  • Prezzo: range min-max                                      │
│  • Rating: minimo stelle                                      │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  ORDINAMENTO                                                  │
├───────────────────────────────────────────────────────────────┤
│  • Rilevanza (score fuzzy + distanza)                         │
│  • Distanza (più vicini prima)                                │
│  • Prezzo (crescente/decrescente)                             │
│  • Rating (più votati prima)                                  │
│  • Recensioni (più recensiti prima)                           │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
╔═══════════════════════════════════════════════════════════════╗
║  RISULTATI (paginati, 20 per pagina)                          ║
╠═══════════════════════════════════════════════════════════════╣
║  ┌─────────────────────────────────────────────────────┐     ║
║  │ 🖼️ Pulizie Casa - €25/ora - ⭐4.8 (24)              │     ║
║  │ 📍 2.3 km - Via Torino 15, Milano                   │     ║
║  │ "Pulizia professionale completa..."                 │     ║
║  └─────────────────────────────────────────────────────┘     ║
║  ┌─────────────────────────────────────────────────────┐     ║
║  │ 🖼️ Pulizie Ufficio - €30/ora - ⭐4.5 (18)           │     ║
║  │ 📍 4.1 km - Corso Buenos Aires 12                   │     ║
║  └─────────────────────────────────────────────────────┘     ║
╚═══════════════════════════════════════════════════════════════╝
```

## Query Ricerca Backend

```typescript
// src/services/servicesService.ts
async function searchServices(params: SearchParams) {
  const {
    query,
    lat,
    lng,
    radius = 10000, // metri
    category,
    minPrice,
    maxPrice,
    minRating,
    page = 1,
    limit = 20,
    sortBy = 'relevance'
  } = params;

  // Costruzione query dinamica
  const services = await prisma.$queryRaw`
    SELECT 
      s.*,
      ST_Distance(
        s.location::geography, 
        ST_MakePoint(${lng}, ${lat})::geography
      ) as distance,
      u.name as provider_name,
      u.avatar as provider_avatar
    FROM "Service" s
    JOIN "User" u ON s."providerId" = u.id
    WHERE 
      s."isActive" = true
      AND ST_DWithin(
        s.location::geography,
        ST_MakePoint(${lng}, ${lat})::geography,
        ${radius}
      )
      ${category ? Prisma.sql`AND s.category = ${category}` : Prisma.empty}
      ${minPrice ? Prisma.sql`AND s.price >= ${minPrice}` : Prisma.empty}
      ${maxPrice ? Prisma.sql`AND s.price <= ${maxPrice}` : Prisma.empty}
      ${minRating ? Prisma.sql`AND s.rating >= ${minRating}` : Prisma.empty}
      ${query ? Prisma.sql`AND (
        s.name ILIKE ${`%${query}%`} 
        OR s.description ILIKE ${`%${query}%`}
      )` : Prisma.empty}
    ORDER BY ${getSortOrder(sortBy)}
    LIMIT ${limit}
    OFFSET ${(page - 1) * limit}
  `;

  return services;
}
```

## Gestione Immagini

```typescript
// src/config/upload.ts
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/services');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2)}`;
    cb(null, `${uniqueName}${path.extname(file.originalname)}`);
  }
});

export const uploadServiceImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Solo immagini JPG, PNG o WebP'));
    }
  }
}).array('images', 5);
```

## Schema Database

```prisma
model Service {
  id          String   @id @default(cuid())
  name        String
  description String
  category    String
  subcategory String?
  price       Float
  duration    Int      // minuti
  
  // Localizzazione PostGIS
  location    Unsupported("geography(Point,4326)")?
  address     String
  city        String
  maxDistance Float    @default(10)
  
  // Media
  images      String[]
  
  // Stats
  rating      Float    @default(0)
  reviewCount Int      @default(0)
  isActive    Boolean  @default(true)
  
  // Relazioni
  providerId  String
  provider    User     @relation(fields: [providerId])
  bookings    Booking[]
  reviews     Review[]
  availability DayAvailability[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([category])
  @@index([providerId])
}

model DayAvailability {
  id        String  @id @default(cuid())
  serviceId String
  day       Int     // 0=Dom, 1=Lun, ..., 6=Sab
  enabled   Boolean @default(true)
  startTime String  // "08:00"
  endTime   String  // "18:00"
  
  service   Service @relation(fields: [serviceId])
}
```

## Componente Lista Servizi Provider

```tsx
// src-react/components/provider/ServiceList.tsx
const ServiceList: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyServices();
  }, []);

  const toggleActive = async (id: string, isActive: boolean) => {
    await api.put(`/services/${id}`, { isActive: !isActive });
    setServices(services.map(s => 
      s.id === id ? { ...s, isActive: !isActive } : s
    ));
  };

  return (
    <div className="service-list">
      <div className="header">
        <h2>I Miei Servizi</h2>
        <button onClick={() => setShowCreate(true)}>
          + Nuovo Servizio
        </button>
      </div>

      {services.map(service => (
        <div key={service.id} className="service-card">
          <img src={service.images[0]} alt={service.name} />
          
          <div className="info">
            <h3>{service.name}</h3>
            <div className="stats">
              <span>€{service.price}/ora</span>
              <span>⭐ {service.rating} ({service.reviewCount})</span>
            </div>
          </div>

          <div className="actions">
            <Switch 
              checked={service.isActive}
              onChange={() => toggleActive(service.id, service.isActive)}
              label={service.isActive ? "Attivo" : "Disattivo"}
            />
            <button onClick={() => editService(service.id)}>
              Modifica
            </button>
            <button 
              className="danger"
              onClick={() => confirmDelete(service.id)}
            >
              Elimina
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Categorie Disponibili

| Categoria | Icona | Sottocategorie |
|-----------|-------|----------------|
| pulizie | 🧹 | casa, ufficio, post-cantiere |
| giardinaggio | 🌱 | manutenzione, potatura, irrigazione |
| idraulica | 🔧 | riparazioni, installazione, emergenze |
| elettricista | ⚡ | impianti, riparazioni, certificazioni |
| traslochi | 📦 | locale, nazionale, sgomberi |
| imbianchino | 🎨 | interni, esterni, decorativo |
| altro | ⚙️ | personalizzato |
