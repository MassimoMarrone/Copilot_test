import React, { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
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
      // If logged in, go to dashboard to book (or open modal here in future)
      // For now, let's redirect to dashboard with a query param to open booking
      // But since we removed search from dashboard, we might need to pass the service details
      // simpler: just navigate to dashboard and maybe we can re-add a "Book Service" hidden mode there?
      // Or better: Just tell them to go to dashboard? No that's bad UX.

      // Let's just redirect to client dashboard for now, assuming they can see their bookings.
      // The user said "dashboard must contain only data relative to services".
      // If they want to BOOK, they are on the search page.
      // So the booking modal SHOULD be here.

      alert(
        `Prenotazione per ${service.title} - Funzionalità in arrivo su questa pagina!`
      );
    } else {
      alert("Per prenotare questo servizio, effettua il login o registrati.");
      onLoginClick();
    }
  };

  return (
    <>
      {/* Hero Section with Search */}
      <div className="hero-section">
        <div className="container">
          <div className="hero-content-centered">
            <h1 className="hero-title">
              Trova Servizi di Pulizia Professionali
            </h1>
            <p className="hero-subtitle">
              Cerca e prenota i migliori servizi di pulizia per la tua casa o
              AirBnB
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
          <p>&copy; 2024 Servizi di Pulizia. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
