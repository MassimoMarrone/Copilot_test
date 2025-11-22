import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/ServicesPage.css";

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

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Booking form state
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
      setServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  };

  const openBookingModal = (service: Service) => {
    setSelectedService(service);
    setShowBookingModal(true);
    const today = new Date().toISOString().split("T")[0];
    setBookingDate(today);
    setClientPhone("");
    setPreferredTime("");
    setBookingNotes("");
    setBookingAddress("");
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedService(null);
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
    <div className="services-page">
      <div className="page-header">
        <h1>Esplora Servizi</h1>
        <p>Trova il professionista giusto per le tue esigenze</p>
      </div>

      {loading ? (
        <div className="loading-spinner">Caricamento...</div>
      ) : (
        <div className="services-grid">
          {services.length === 0 ? (
            <div className="empty-state">Nessun servizio disponibile al momento.</div>
          ) : (
            services.map((service) => (
              <div key={service.id} className="service-card">
                <div className="service-image-placeholder">
                  {/* Placeholder for service image */}
                  <span>{service.title.charAt(0)}</span>
                </div>
                <div className="service-content">
                  <h3>{service.title}</h3>
                  <p className="service-price">€{service.price.toFixed(2)}</p>
                  <p className="service-description">{service.description}</p>
                  {service.address && (
                    <p className="service-location">📍 {service.address}</p>
                  )}
                  <button 
                    className="btn-book"
                    onClick={() => openBookingModal(service)}
                  >
                    Prenota Ora
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

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
                dopo il completamento del pagamento.
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
    </div>
  );
};

export default ServicesPage;
