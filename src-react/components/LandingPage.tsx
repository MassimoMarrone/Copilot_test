import React, { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import heroImage from "../assets/hero.jpg";
import "../styles/LandingPage.css";

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  user?: any;
}

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

const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onRegisterClick,
  user,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [showResults, setShowResults] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await fetch("/api/services");
      const data = await response.json();
      const servicesArray = Array.isArray(data) ? data : [];
      setServices(servicesArray);
      setFilteredServices(servicesArray);
    } catch (error) {
      console.error("Error loading services:", error);
      setServices([]);
      setFilteredServices([]);
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
    setShowResults(true);
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

  const handleServiceClick = (service: Service) => {
    if (user) {
      setSelectedService(service);
      setShowBookingModal(true);
      const today = new Date().toISOString().split("T")[0];
      setBookingDate(today);
      setClientPhone("");
      setPreferredTime("");
      setBookingNotes("");
      setBookingAddress("");
    } else {
      alert("Per prenotare questo servizio, effettua il login o registrati.");
      onLoginClick();
    }
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedService(null);
    setBookingDate("");
    setClientPhone("");
    setPreferredTime("");
    setBookingNotes("");
    setBookingAddress("");
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
          clientPhone: clientPhone,
          preferredTime: preferredTime,
          notes: bookingNotes,
          address: bookingAddress,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        // Redirect to Stripe checkout immediately
        window.location.href = url;
      } else {
        const data = await response.json();
        alert(data.error || "Errore nella prenotazione");
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  };

  return (
    <>
      {/* Hero Section with Search */}
      <div 
        className="hero-section"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="container">
          <div className="hero-content-centered">
            <h1 className="hero-title">
              domy
            </h1>
            <p className="hero-subtitle">
              Il modo più semplice per prenotare servizi di pulizia professionali
            </p>
            <div className="search-container">
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </div>

      {/* Search Results Section */}
      {showResults && (
        <div className="search-results-section">
          <div className="container">
            <h2 className="section-title">
              Servizi Disponibili ({filteredServices.length})
            </h2>
            <div className="services-grid">
              {filteredServices.length === 0 ? (
                <div className="empty-state">
                  <p>Nessun servizio trovato. Prova con una ricerca diversa.</p>
                </div>
              ) : (
                (Array.isArray(filteredServices) ? filteredServices : [])
                  .slice(0, 6)
                  .map((service) => (
                    <div
                      key={service.id}
                      className="service-card"
                      onClick={() => handleServiceClick(service)}
                    >
                      <h3>{service.title}</h3>
                      <p className="service-description">
                        {service.description}
                      </p>
                      {service.address && (
                        <p className="service-location">📍 {service.address}</p>
                      )}
                      <p className="service-price">
                        €{service.price.toFixed(2)}
                      </p>
                      <button className="btn btn-book">Prenota Ora</button>
                    </div>
                  ))
              )}
            </div>
            {filteredServices.length > 6 && (
              <div className="login-prompt">
                <p>Per visualizzare tutti i servizi disponibili,</p>
                <button onClick={onLoginClick} className="btn btn-primary">
                  Accedi
                </button>
                <span> o </span>
                <button onClick={onRegisterClick} className="btn btn-secondary">
                  Registrati
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 domy. Tutti i diritti riservati.</p>
        </div>
      </footer>

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <div className="modal-overlay" onClick={closeBookingModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeBookingModal}>
              &times;
            </button>
            <h2>Prenota Servizio</h2>
            <div className="service-summary">
              <h3>{selectedService.title}</h3>
              <p className="price">
                Prezzo: €{selectedService.price.toFixed(2)}
              </p>
            </div>
            <form onSubmit={handleBooking}>
              <div className="form-group">
                <label htmlFor="bookingDate">Data del Servizio: *</label>
                <input
                  type="date"
                  id="bookingDate"
                  value={bookingDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="clientPhone">Telefono di Contatto:</label>
                <input
                  type="tel"
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+39 123 456 7890"
                  maxLength={50}
                />
              </div>
              <div className="form-group">
                <label htmlFor="preferredTime">Orario Preferito:</label>
                <input
                  type="time"
                  id="preferredTime"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="bookingAddress">Indirizzo del Servizio:</label>
                <input
                  type="text"
                  id="bookingAddress"
                  value={bookingAddress}
                  onChange={(e) => setBookingAddress(e.target.value)}
                  placeholder="Via, Città, CAP"
                  maxLength={500}
                />
              </div>
              <div className="form-group">
                <label htmlFor="bookingNotes">Note Aggiuntive:</label>
                <textarea
                  id="bookingNotes"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Aggiungi qualsiasi informazione utile per il fornitore..."
                  rows={4}
                  maxLength={1000}
                />
              </div>
              <div className="info-box">
                ℹ️ <strong>Pagamento Obbligatorio:</strong> Sarai reindirizzato
                alla pagina di pagamento. La prenotazione sarà confermata solo
                dopo il completamento del pagamento. Il pagamento sarà
                trattenuto in modo sicuro in escrow fino al completamento del
                servizio.
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-primary">
                  Procedi al Pagamento
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
    </>
  );
};

export default LandingPage;
