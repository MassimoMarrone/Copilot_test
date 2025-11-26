import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ServiceReviewsModal from "../components/ServiceReviewsModal";
import SearchBar from "../components/SearchBar";
import ServiceMap from "../components/ServiceMap";
import SmartBookingForm, { SmartBookingData } from "../components/SmartBookingForm";
import { servicesService, Service } from "../services/servicesService";
import { bookingService } from "../services/bookingService";
import "../styles/ServicesPage.css";

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface ProviderAvailability {
  weekly: WeeklySchedule;
  blockedDates: string[];
}

// Service interface is imported from servicesService

const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Reviews modal state
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewsService, setReviewsService] = useState<Service | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await servicesService.getAllServices();
      setServices(data);
      setFilteredServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  };

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSearch = (
    query: string,
    location?: { lat: number; lng: number; address: string },
    priceRange?: { min: number; max: number },
    category?: string,
    products?: string[]
  ) => {
    let filtered = services;

    // Filter by category
    if (category && category !== "Tutte") {
      filtered = filtered.filter((service) => service.category === category);
    }

    // Filter by products
    if (products && products.length > 0) {
      filtered = filtered.filter((service) => {
        if (!service.productsUsed || service.productsUsed.length === 0)
          return false;
        // Check if service has ALL selected products (AND logic)
        // Or ANY selected product (OR logic) - usually OR is better for discovery, but AND is more precise.
        // Let's go with OR logic for now (if service has at least one of the selected products)
        // Actually, if I select "Eco-friendly" and "Pet-friendly", I probably want services that are BOTH.
        // Let's stick to AND logic for now as it's a filter.
        return products.every((p) => service.productsUsed!.includes(p));
      });
    }

    // Filter by search query
    if (query.trim()) {
      filtered = filtered.filter(
        (service) =>
          service.title.toLowerCase().includes(query.toLowerCase()) ||
          service.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Filter by location (if provided)
    if (location && location.lat && location.lng) {
      filtered = filtered.filter((service) => {
        if (!service.latitude || !service.longitude) return false;

        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          location.lat,
          location.lng,
          service.latitude,
          service.longitude
        );

        // Filter services within 50km
        return distance <= 50;
      });
    }

    // Filter by price range
    if (priceRange) {
      if (priceRange.min > 0) {
        filtered = filtered.filter(
          (service) => service.price >= priceRange.min
        );
      }
      if (priceRange.max < Infinity) {
        filtered = filtered.filter(
          (service) => service.price <= priceRange.max
        );
      }
    }

    setFilteredServices(filtered);
  };

  const openBookingModal = (service: Service) => {
    setSelectedService(service);
    setShowBookingModal(true);
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedService(null);
  };

  const openReviewsModal = (service: Service) => {
    setReviewsService(service);
    setShowReviewsModal(true);
  };

  const closeReviewsModal = () => {
    setShowReviewsModal(false);
    setReviewsService(null);
  };

  // Handle smart booking submission
  const handleSmartBooking = async (bookingData: SmartBookingData) => {
    if (!selectedService || !user) return;

    try {
      const { url } = await bookingService.createBooking({
        serviceId: selectedService.id,
        date: bookingData.date,
        clientPhone: bookingData.clientPhone,
        preferredTime: bookingData.startTime,
        notes: bookingData.notes || "",
        address: bookingData.address,
        squareMetersRange: bookingData.squareMetersRange,
        windowsCount: bookingData.windowsCount,
        estimatedDuration: bookingData.estimatedDuration,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
      });

      window.location.href = url;
    } catch (error: any) {
      alert(error.message || "Errore nella prenotazione");
    }
  };

  return (
    <div className="services-page">
      <div className="page-header">
        <h1>Esplora Servizi</h1>
        <p>Trova il professionista giusto per le tue esigenze</p>
      </div>

      <SearchBar onSearch={handleSearch} />

      <div
        className="view-toggle-container"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "20px",
          gap: "10px",
        }}
      >
        <button
          className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
          onClick={() => setViewMode("list")}
          style={{
            padding: "8px 16px",
            borderRadius: "20px",
            border: "1px solid #ddd",
            background: viewMode === "list" ? "#000" : "white",
            color: viewMode === "list" ? "white" : "#333",
            cursor: "pointer",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          📋 Lista
        </button>
        <button
          className={`view-toggle-btn ${viewMode === "map" ? "active" : ""}`}
          onClick={() => setViewMode("map")}
          style={{
            padding: "8px 16px",
            borderRadius: "20px",
            border: "1px solid #ddd",
            background: viewMode === "map" ? "#000" : "white",
            color: viewMode === "map" ? "white" : "#333",
            cursor: "pointer",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          🗺️ Mappa
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Caricamento...</div>
      ) : viewMode === "map" ? (
        <ServiceMap services={filteredServices} onBook={openBookingModal} />
      ) : (
        <div className="services-grid">
          {filteredServices.length === 0 ? (
            <div className="empty-state">
              Nessun servizio disponibile al momento.
            </div>
          ) : (
            filteredServices.map((service) => (
              <div key={service.id} className="service-card">
                {service.imageUrl ? (
                  <img
                    src={service.imageUrl}
                    alt={service.title}
                    className="service-image"
                    style={{
                      height: "200px",
                      objectFit: "cover",
                      width: "100%",
                    }}
                  />
                ) : (
                  <div className="service-image-placeholder">
                    {/* Placeholder for service image */}
                    <span>{service.title.charAt(0)}</span>
                  </div>
                )}
                <div className="service-content">
                  <h3>{service.title}</h3>
                  <p className="service-price">€{service.price.toFixed(2)}</p>
                  <div
                    className="service-rating"
                    onClick={() => openReviewsModal(service)}
                    title="Clicca per vedere le recensioni"
                  >
                    <span className="rating-stars">
                      {"⭐".repeat(Math.round(service.averageRating || 0))}
                      {"☆".repeat(5 - Math.round(service.averageRating || 0))}
                    </span>
                    <span className="review-count">
                      ({service.reviewCount || 0} recensioni)
                    </span>
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <a
                      href={`/provider/${service.providerId}`}
                      className="provider-profile-link"
                      style={{
                        color: "#007bff",
                        textDecoration: "none",
                        fontSize: "0.9rem",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      👤 Vedi Profilo Fornitore
                    </a>
                  </div>

                  <p className="service-description">{service.description}</p>

                  {service.productsUsed && service.productsUsed.length > 0 && (
                    <div className="service-products">
                      {service.productsUsed.map((product) => (
                        <span key={product} className="product-tag">
                          {product}
                        </span>
                      ))}
                    </div>
                  )}

                  {service.address && (
                    <p className="service-location">📍 {service.address}</p>
                  )}
                  <button
                    className="btn-book"
                    onClick={() => openBookingModal(service)}
                  >
                    Prenota Ora
                  </button>
                  <button
                    className="btn-reviews"
                    onClick={() => openReviewsModal(service)}
                  >
                    Leggi Recensioni
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Booking Modal with Smart Booking Form */}
      {showBookingModal && selectedService && (
        <div className="modal-overlay" onClick={closeBookingModal}>
          <div className="modal-content smart-booking-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeBookingModal}>
              &times;
            </button>
            <SmartBookingForm
              service={selectedService}
              onSubmit={handleSmartBooking}
              onCancel={closeBookingModal}
            />
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsModal && reviewsService && (
        <ServiceReviewsModal
          serviceId={reviewsService.id}
          serviceTitle={reviewsService.title}
          onClose={closeReviewsModal}
        />
      )}
    </div>
  );
};

export default ServicesPage;
