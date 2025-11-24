import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import ServiceReviewsModal from "../components/ServiceReviewsModal";
import SearchBar from "../components/SearchBar";
import ServiceMap from "../components/ServiceMap";
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
  availability?: ProviderAvailability;
  productsUsed?: string[];
}

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Reviews modal state
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewsService, setReviewsService] = useState<Service | null>(null);

  // Booking form state
  const [bookingDate, setBookingDate] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const calendarRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
      if (
        timePickerRef.current &&
        !timePickerRef.current.contains(event.target as Node)
      ) {
        setIsTimePickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await fetch("/api/services");
      const data = await response.json();
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
    const today = new Date();
    setBookingDate(today.toISOString().split("T")[0]);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setIsCalendarOpen(false);
    setIsTimePickerOpen(false);
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
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Generate calendar days (current month view)
  const generateCalendarDays = () => {
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    // Adjust to make Monday = 0, Sunday = 6
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const days = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const date = new Date(currentYear, currentMonth, d);
      // Fix timezone offset issue for string comparison
      const dateString = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
      )
        .toISOString()
        .split("T")[0];

      let isUnavailable = false;
      if (selectedService && selectedService.availability) {
        // Check blocked dates
        if (selectedService.availability.blockedDates.includes(dateString)) {
          isUnavailable = true;
        } else {
          // Check weekly schedule
          const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday...
          const dayMap: (keyof WeeklySchedule)[] = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ];
          const dayKey = dayMap[dayOfWeek];
          if (!selectedService.availability.weekly[dayKey].enabled) {
            isUnavailable = true;
          }
        }
      }

      days.push({
        date: date,
        dateString: dateString,
        day: d,
        isPast: date < todayStart,
        isToday: date.getTime() === todayStart.getTime(),
        isUnavailable: isUnavailable,
        empty: false,
        key: dateString,
      });
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getMonthName = (monthIndex: number) => {
    const date = new Date(2024, monthIndex, 1);
    return date.toLocaleString("it-IT", { month: "long" });
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
                      style={{ color: "#007bff", textDecoration: "none", fontSize: "0.9rem" }}
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
                <label className="section-label">📅 Seleziona la Data *</label>

                <div className="date-picker-container" ref={calendarRef}>
                  <div
                    className="date-input-wrapper"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  >
                    <input
                      type="text"
                      readOnly
                      className="date-input"
                      value={
                        bookingDate
                          ? new Date(bookingDate).toLocaleDateString("it-IT", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "Seleziona una data"
                      }
                    />
                    <span className="calendar-icon">📅</span>
                  </div>

                  {isCalendarOpen && (
                    <div className="calendar-popup">
                      <div className="calendar-header">
                        <button
                          type="button"
                          className="month-nav-btn"
                          onClick={handlePrevMonth}
                        >
                          &lt;
                        </button>
                        <h4>
                          {getMonthName(currentMonth)} {currentYear}
                        </h4>
                        <button
                          type="button"
                          className="month-nav-btn"
                          onClick={handleNextMonth}
                        >
                          &gt;
                        </button>
                      </div>

                      <div className="calendar-weekdays">
                        <div className="weekday-label">Lun</div>
                        <div className="weekday-label">Mar</div>
                        <div className="weekday-label">Mer</div>
                        <div className="weekday-label">Gio</div>
                        <div className="weekday-label">Ven</div>
                        <div className="weekday-label">Sab</div>
                        <div className="weekday-label">Dom</div>
                      </div>

                      <div className="calendar-days-grid">
                        {calendarDays.map((day) =>
                          day.empty ? (
                            <div
                              key={day.key}
                              className="calendar-day-cell empty"
                            ></div>
                          ) : (
                            <button
                              key={day.key}
                              type="button"
                              className={`calendar-day-cell ${
                                day.isPast || day.isUnavailable
                                  ? "disabled"
                                  : ""
                              } ${
                                bookingDate === day.dateString ? "selected" : ""
                              } ${day.isToday ? "today" : ""}`}
                              onClick={() => {
                                if (
                                  !day.isPast &&
                                  !day.isUnavailable &&
                                  day.dateString
                                ) {
                                  setBookingDate(day.dateString);
                                  setIsCalendarOpen(false);
                                }
                              }}
                              disabled={day.isPast || day.isUnavailable}
                            >
                              {day.day}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Time Slots Section */}
              <div className="form-section">
                <label className="section-label">🕐 Seleziona l'Orario</label>

                <div className="time-picker-container" ref={timePickerRef}>
                  <div
                    className="time-input-wrapper"
                    onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
                  >
                    <input
                      type="text"
                      readOnly
                      className="time-input"
                      value={selectedTimeSlot || "Seleziona un orario"}
                    />
                    <span className="time-icon">🕐</span>
                  </div>

                  {isTimePickerOpen && (
                    <div className="time-popup">
                      <div className="time-slots-list">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            className={`time-slot-item ${
                              selectedTimeSlot === slot ? "selected" : ""
                            }`}
                            onClick={() => {
                              setSelectedTimeSlot(slot);
                              setPreferredTime(slot);
                              setIsTimePickerOpen(false);
                            }}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                <label className="section-label">📝 Note Aggiuntive</label>
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
