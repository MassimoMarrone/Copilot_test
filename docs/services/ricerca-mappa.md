# 🗺️ Ricerca Geografica e Mappa

## Panoramica
Il sistema utilizza Google Maps API e PostGIS per la ricerca geografica dei servizi, permettendo agli utenti di trovare fornitori nella loro area.

## Architettura

```
╔═══════════════════════════════════════════════════════════════╗
║                   STACK GEOGRAFICO                            ║
╚═══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                       │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │ @react-google-maps│  │ Places Autocomplete│                  │
│  │ /api              │  │ API               │                  │
│  └───────────────────┘  └───────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND                                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  PostGIS Extension                                        │ │
│  │  • geography(Point, 4326) - coordinate WGS84             │ │
│  │  • ST_DWithin() - ricerca per raggio                     │ │
│  │  • ST_Distance() - calcolo distanza                      │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Componente AddressAutocomplete

```tsx
// src-react/components/AddressAutocomplete.tsx
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

interface Props {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
}

const AddressAutocomplete: React.FC<Props> = ({ value, onChange, placeholder }) => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: ["places"],
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        onChange(place.formatted_address || "", lat, lng);
      }
    }
  };

  if (!isLoaded) return <input disabled placeholder="Caricamento..." />;

  return (
    <Autocomplete
      onLoad={setAutocomplete}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: "it" }, // Solo Italia
        types: ["address"],
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value, 0, 0)}
        placeholder={placeholder || "Inserisci indirizzo..."}
        className="address-input"
      />
    </Autocomplete>
  );
};
```

## Componente ServiceMap

```tsx
// src-react/components/ServiceMap.tsx
import { GoogleMap, MarkerF, InfoWindowF, CircleF } from "@react-google-maps/api";

interface Props {
  services: Service[];
  center: { lat: number; lng: number };
  radius?: number; // km
  onServiceSelect?: (service: Service) => void;
}

const ServiceMap: React.FC<Props> = ({ services, center, radius, onServiceSelect }) => {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    styles: mapStyles, // Custom dark/light styles
  };

  return (
    <GoogleMap
      mapContainerClassName="service-map"
      center={center}
      zoom={12}
      options={mapOptions}
    >
      {/* Cerchio area di ricerca */}
      {radius && (
        <CircleF
          center={center}
          radius={radius * 1000} // km -> metri
          options={{
            fillColor: "#3b82f6",
            fillOpacity: 0.1,
            strokeColor: "#3b82f6",
            strokeWeight: 2,
          }}
        />
      )}

      {/* Marker posizione utente */}
      <MarkerF
        position={center}
        icon={{
          url: "/icons/user-location.svg",
          scaledSize: new google.maps.Size(40, 40),
        }}
      />

      {/* Marker servizi */}
      {services.map((service) => (
        <MarkerF
          key={service.id}
          position={{ lat: service.location.lat, lng: service.location.lng }}
          onClick={() => setSelectedService(service)}
          icon={{
            url: getCategoryIcon(service.category),
            scaledSize: new google.maps.Size(32, 32),
          }}
        />
      ))}

      {/* Info Window */}
      {selectedService && (
        <InfoWindowF
          position={{ 
            lat: selectedService.location.lat, 
            lng: selectedService.location.lng 
          }}
          onCloseClick={() => setSelectedService(null)}
        >
          <div className="map-info-window">
            <img src={selectedService.images[0]} alt="" />
            <h4>{selectedService.name}</h4>
            <p>€{selectedService.price}/ora • ⭐{selectedService.rating}</p>
            <button onClick={() => onServiceSelect?.(selectedService)}>
              Prenota
            </button>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
};
```

## Ricerca Geografica Backend

```typescript
// src/services/servicesService.ts
import { prisma } from "../server";
import { Prisma } from "@prisma/client";

interface GeoSearchParams {
  lat: number;
  lng: number;
  radiusKm: number;
  category?: string;
  query?: string;
}

async function searchByLocation(params: GeoSearchParams) {
  const { lat, lng, radiusKm, category, query } = params;
  const radiusMeters = radiusKm * 1000;

  const services = await prisma.$queryRaw<ServiceWithDistance[]>`
    SELECT 
      s.*,
      u.name as "providerName",
      u.avatar as "providerAvatar",
      ST_Distance(
        s.location::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) / 1000 as "distanceKm"
    FROM "Service" s
    JOIN "User" u ON s."providerId" = u.id
    WHERE 
      s."isActive" = true
      AND ST_DWithin(
        s.location::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
      ${category ? Prisma.sql`AND s.category = ${category}` : Prisma.empty}
      ${query ? Prisma.sql`AND (
        s.name ILIKE ${`%${query}%`} 
        OR s.description ILIKE ${`%${query}%`}
      )` : Prisma.empty}
    ORDER BY "distanceKm" ASC
  `;

  return services;
}
```

## Flusso Ricerca Completo

```
╔═══════════════════════════════════════════════════════════════╗
║                    FLUSSO RICERCA                             ║
╚═══════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────┐
│  1. UTENTE INSERISCE RICERCA                                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ 🔍 "pulizie"        📍 "Milano, Via Roma 10"       │     │
│  └─────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  2. GOOGLE PLACES AUTOCOMPLETE                                │
│                                                               │
│  Indirizzo → Coordinate (lat: 45.4642, lng: 9.1900)          │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  3. CHIAMATA API                                              │
│                                                               │
│  GET /api/services/search                                     │
│  ?query=pulizie                                               │
│  &lat=45.4642                                                 │
│  &lng=9.1900                                                  │
│  &radius=10                                                   │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  4. QUERY POSTGIS                                             │
│                                                               │
│  • ST_DWithin per filtrare nel raggio                        │
│  • ST_Distance per calcolare distanza                        │
│  • ORDER BY distanza ASC                                     │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  5. RISULTATI                                                 │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ Lista Servizi         │  🗺️ Mappa                  │     │
│  │ ├─ Pulizie Casa 2.3km │     [●] Utente             │     │
│  │ ├─ Pulizie Pro  3.1km │     [◆] [◆] [◆] Servizi    │     │
│  │ └─ CleanService 4.5km │     (   ) Area ricerca     │     │
│  └─────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

## Calcolo Copertura Fornitore

```typescript
// Verifica se il fornitore copre una determinata posizione
async function providerCoversLocation(
  serviceId: string, 
  clientLat: number, 
  clientLng: number
): Promise<boolean> {
  const result = await prisma.$queryRaw<[{ covers: boolean }]>`
    SELECT ST_DWithin(
      s.location::geography,
      ST_SetSRID(ST_MakePoint(${clientLng}, ${clientLat}), 4326)::geography,
      s."maxDistance" * 1000  -- maxDistance in km -> metri
    ) as covers
    FROM "Service" s
    WHERE s.id = ${serviceId}
  `;

  return result[0]?.covers ?? false;
}
```

## Configurazione PostGIS

```sql
-- Abilitare estensione PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Creare colonna geography
ALTER TABLE "Service" 
ADD COLUMN location geography(Point, 4326);

-- Indice spaziale per performance
CREATE INDEX idx_service_location 
ON "Service" 
USING GIST (location);

-- Aggiornare location da lat/lng esistenti
UPDATE "Service" 
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE lat IS NOT NULL AND lng IS NOT NULL;
```

## Geolocalizzazione Browser

```typescript
// Ottenere posizione corrente dell'utente
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizzazione non supportata"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache 5 minuti
      }
    );
  });
}

// Utilizzo
async function useCurrentLocation() {
  try {
    const position = await getCurrentPosition();
    setCenter({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
    searchServices();
  } catch (error) {
    // Fallback: chiedi all'utente di inserire indirizzo
    showAddressInput();
  }
}
```

## Stili Mappa Custom

```typescript
const mapStyles = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  // ... altri stili per tema chiaro/scuro
];
```

## Environment Variables

```env
# .env
VITE_GOOGLE_MAPS_KEY=AIzaSy...your-key...

# Server-side (opzionale, per geocoding server-side)
GOOGLE_MAPS_SERVER_KEY=AIzaSy...server-key...
```
