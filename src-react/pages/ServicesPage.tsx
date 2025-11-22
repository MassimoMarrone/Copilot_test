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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");

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
    setSelectedTimeSlot("");
  };

  // Generate available time slots
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 8; // 8:00 AM
    const endHour = 20; // Last slot at 7:30 PM (19:30)
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Generate calendar days (current month view)
  const generateCalendarDays = () => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    const days = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(currentYear, currentMonth, d);
      days.push({
        date: date,
        dateString: date.toISOString().split("T")[0],
        day: d,
        isPast: date < todayStart
      });
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedService(null);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    // Use selectedTimeSlot if available, otherwise use preferredTime
    const finalTime = selectedTimeSlot || preferredTime;

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
          preferredTime: finalTime,
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
            <div className="empty-state">
              Nessun servizio disponibile al momento.
            </div>
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
            <form onSubmit={handleBooking} className="booking-form">
              {/* Calendar Section */}
              <div className="form-section">
                <label className="section-label">
                  📅 Seleziona la Data *
                </label>
                <div className="calendar-grid">
                  {calendarDays.map((day) => (
                    <button
                      key={day.dateString}
                      type="button"
                      className={`calendar-day ${
                        day.isPast ? "past" : ""
                      } ${bookingDate === day.dateString ? "selected" : ""}`}
                      onClick={() => !day.isPast && setBookingDate(day.dateString)}
                      disabled={day.isPast}
                    >
                      <span className="day-number">{day.day}</span>
                      <span className="day-label">
                        {day.date.toLocaleDateString("it-IT", { weekday: "short" })}
                      </span>
                    </button>
                  ))}
                </div>
                {bookingDate && (
                  <div className="selected-date-display">
                    Data selezionata: <strong>{(() => {
                      const [year, month, day] = bookingDate.split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString("it-IT", { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    })()}</strong>
                  </div>
                )}
              </div>

              {/* Time Slots Section */}
              <div className="form-section">
                <label className="section-label">
                  🕐 Seleziona l'Orario
                </label>
                <div className="time-slots-grid">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`time-slot ${
                        selectedTimeSlot === slot ? "selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedTimeSlot(slot);
                        setPreferredTime(slot);
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                {selectedTimeSlot && (
                  <div className="selected-time-display">
                    Orario selezionato: <strong>{selectedTimeSlot}</strong>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="form-section">
                <label className="section-label">
                  📞 Informazioni di Contatto
                </label>
                <div className="form-group">
                  <label htmlFor="clientPhone">Telefono di Contatto:</label>
                  <input
                    type="tel"
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+39 123 456 7890"
                    maxLength={50}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Service Address */}
              <div className="form-section">
                <label className="section-label">
                  📍 Indirizzo del Servizio
                </label>
                <div className="form-group">
                  <input
                    type="text"
                    id="bookingAddress"
                    value={bookingAddress}
                    onChange={(e) => setBookingAddress(e.target.value)}
                    placeholder="Via, Città, CAP"
                    maxLength={500}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div className="form-section">
                <label className="section-label">
                  📝 Note Aggiuntive
                </label>
                <div className="form-group">
                  <textarea
                    id="bookingNotes"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Aggiungi qualsiasi informazione utile per il fornitore..."
                    rows={4}
                    maxLength={1000}
                    className="form-textarea"
                  />
                  <div className="char-counter">
                    {bookingNotes.length} / 1000 caratteri
                  </div>
                </div>
              </div>

              <div className="info-box">
                ℹ️ <strong>Pagamento Obbligatorio:</strong> Sarai reindirizzato
                alla pagina di pagamento. La prenotazione sarà confermata solo
                dopo il completamento del pagamento.
              </div>
              
              <div className="button-group">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!bookingDate}
                >
                  ✓ Procedi al Pagamento
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeBookingModal}
                >
                  ✕ Annulla
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
