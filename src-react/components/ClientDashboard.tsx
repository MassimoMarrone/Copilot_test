import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "./SearchBar";
import "../styles/ClientDashboard.css";

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  providerEmail: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface Booking {
  id: string;
  serviceTitle: string;
  date: string;
  amount: number;
  providerEmail: string;
  status: string;
  paymentStatus: string;
  photoProof?: string;
}

interface ClientDashboardProps {
  // googleMapsApiKey removed
}

const ClientDashboard: React.FC<ClientDashboardProps> = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadServices();
    loadBookings();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/me");
      if (!response.ok) {
        navigate("/");
        return;
      }
      const user = await response.json();
      if (user.userType !== "client") {
        navigate("/provider-dashboard");
      }
    } catch (error) {
      navigate("/");
    }
  };

  const loadServices = async () => {
    try {
      const response = await fetch("/api/services");
      const data = await response.json();
      setServices(data);
      setFilteredServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
    }
  };

  const loadBookings = async () => {
    try {
      const response = await fetch("/api/my-bookings");
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  };

  const handleSearch = (
    query: string,
    location?: { lat: number; lng: number; address: string }
  ) => {
    let filtered = services;

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

    setFilteredServices(filtered);
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

  const openBookingModal = (service: Service) => {
    setSelectedService(service);
    setShowBookingModal(true);
    const today = new Date().toISOString().split("T")[0];
    setBookingDate(today);
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedService(null);
    setBookingDate("");
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          date: bookingDate,
        }),
      });

      if (response.ok) {
        alert(
          "Prenotazione confermata! Il pagamento è stato trattenuto in escrow."
        );
        closeBookingModal();
        loadBookings();
      } else {
        const data = await response.json();
        alert(data.error || "Errore nella prenotazione");
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="client-dashboard">
      <div className="dashboard-header">
        <h1>🏠 Dashboard Cliente</h1>
        <button onClick={handleLogout} className="btn btn-logout">
          Logout
        </button>
      </div>

      <div className="dashboard-section">
        <h2>🔍 Ricerca Servizi</h2>
        <SearchBar onSearch={handleSearch} />

        <div className="services-grid">
          {filteredServices.length === 0 ? (
            <div className="empty-state">
              <p>Nessun servizio disponibile.</p>
            </div>
          ) : (
            filteredServices.map((service) => (
              <div key={service.id} className="service-card">
                <h3>{service.title}</h3>
                <p className="service-description">{service.description}</p>
                {service.address && (
                  <p className="service-location">📍 {service.address}</p>
                )}
                <p className="service-price">€{service.price.toFixed(2)}</p>
                <p className="service-provider">
                  <small>Fornitore: {service.providerEmail}</small>
                </p>
                <button
                  onClick={() => openBookingModal(service)}
                  className="btn btn-book"
                >
                  Prenota
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="dashboard-section">
        <h2>📋 Le Mie Prenotazioni</h2>
        <div className="bookings-list">
          {bookings.length === 0 ? (
            <div className="empty-state">
              <p>Non hai ancora prenotazioni.</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <h3>{booking.serviceTitle}</h3>
                <p>
                  <strong>Data:</strong>{" "}
                  {new Date(booking.date).toLocaleDateString("it-IT")}
                </p>
                <p>
                  <strong>Importo:</strong>{" "}
                  <span className="price">€{booking.amount.toFixed(2)}</span>
                </p>
                <p>
                  <strong>Fornitore:</strong> {booking.providerEmail}
                </p>
                <p>
                  <strong>Stato:</strong>{" "}
                  <span className={`status ${booking.status}`}>
                    {booking.status === "pending" ? "In attesa" : "Completato"}
                  </span>
                </p>
                <p>
                  <strong>Pagamento:</strong>{" "}
                  <span className={`status ${booking.paymentStatus}`}>
                    {booking.paymentStatus === "held_in_escrow"
                      ? "Trattenuto in Escrow"
                      : "Rilasciato al Fornitore"}
                  </span>
                </p>
                {booking.photoProof && (
                  <div className="photo-proof">
                    <p>
                      <strong>Prova Fotografica:</strong>
                    </p>
                    <img
                      src={booking.photoProof}
                      alt="Prova del servizio completato"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <div className="modal-overlay" onClick={closeBookingModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeBookingModal}>
              &times;
            </button>
            <h2>Prenota Servizio</h2>
            <form onSubmit={handleBooking}>
              <div className="form-group">
                <label htmlFor="bookingDate">Data del Servizio:</label>
                <input
                  type="date"
                  id="bookingDate"
                  value={bookingDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>
              <div className="info-box">
                ℹ️ <strong>Pagamento in Escrow:</strong> Il pagamento sarà
                trattenuto in modo sicuro fino al completamento del servizio. Il
                fornitore riceverà il pagamento solo dopo aver caricato la prova
                fotografica del lavoro completato.
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-primary">
                  Conferma Prenotazione
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeBookingModal}
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
