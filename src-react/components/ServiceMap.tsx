import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in React Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Service {
  id: string;
  providerId: string;
  title: string;
  description: string;
  price: number;
  category?: string;
  providerEmail: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  averageRating?: number;
  reviewCount?: number;
  imageUrl?: string;
  productsUsed?: string[];
}

interface ServiceMapProps {
  services: Service[];
  onBook?: (service: Service) => void;
  center?: { lat: number; lng: number } | null;
}

// Component to update map center when services change
const MapUpdater: React.FC<{ services: Service[]; center?: { lat: number; lng: number } | null }> = ({ services, center }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 13);
    } else if (services.length > 0) {
      const bounds = L.latLngBounds(
        services
          .filter((s) => s.latitude && s.longitude)
          .map((s) => [s.latitude!, s.longitude!])
      );

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [services, map, center]);

  return null;
};

const ServiceMap: React.FC<ServiceMapProps> = ({ services, onBook, center }) => {
  // Default center (Rome) if no services
  const defaultCenter: [number, number] = [41.9028, 12.4964];

  const servicesWithLocation = services.filter(
    (s) => s.latitude && s.longitude
  );

  return (
    <div
      className="service-map-container"
      style={{
        height: "600px",
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapUpdater services={servicesWithLocation} center={center} />

        {servicesWithLocation.map((service) => (
          <Marker
            key={service.id}
            position={[service.latitude!, service.longitude!]}
          >
            <Popup>
              <div className="map-popup-content" style={{ minWidth: "200px" }}>
                <h3 style={{ margin: "0 0 5px 0", fontSize: "1rem" }}>
                  {service.title}
                </h3>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
                  €{service.price.toFixed(2)}
                </p>
                <p
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "0.85rem",
                    color: "#666",
                  }}
                >
                  {service.address}
                </p>
                {service.averageRating && (
                  <div style={{ marginBottom: "8px", fontSize: "0.85rem" }}>
                    {"⭐".repeat(Math.round(service.averageRating))}
                    <span style={{ color: "#666", marginLeft: "4px" }}>
                      ({service.reviewCount})
                    </span>
                  </div>
                )}
                {onBook && (
                  <button
                    onClick={() => onBook(service)}
                    style={{
                      width: "100%",
                      padding: "6px 12px",
                      backgroundColor: "#000",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    Prenota
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ServiceMap;
