import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import ToastNotification, { Notification } from "./ToastNotification";
import NotificationCenter from "./NotificationCenter";
// import SearchBar from "./SearchBar"; // Removed
import ReviewModal from "./ReviewModal"; // Will be created next
import "../styles/ClientDashboard.css";
import "../styles/ToastNotification.css";

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
  clientPhone?: string;
  preferredTime?: string;
  notes?: string;
  address?: string;
}

interface ClientDashboardProps {
  // googleMapsApiKey removed
}

const ClientDashboard: React.FC<ClientDashboardProps> = () => {
  const [services, setServices] = useState<Service[]>([]);
  /* const [filteredServices, setFilteredServices] = useState<Service[]>([]); */
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastNotification, setLastNotification] = useState<Notification | null>(
    null
  );
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadServices();
    loadBookings();
    checkAuth();
  }, []);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      verifyPayment(sessionId);
    } else if (paymentStatus === "cancel") {
      alert("Pagamento annullato.");
    }
  }, [searchParams]);

  // Socket.IO connection for real-time updates
  useEffect(() => {
    if (!userId) return;

    // Use relative path so it works both on localhost and via tunnel
    // Force websocket transport to avoid polling issues with tunnels
    const socket = io({
      transports: ["websocket"],
      path: "/socket.io/",
    });

    socket.on("connect", () => {
      console.log("Connected to socket server for updates");
      socket.emit("join_user_room", userId);
    });

    socket.on("new_notification", (notification: Notification) => {
      setNotifications((prev) => [...prev, notification]);
      setLastNotification(notification);
    });

    socket.on("booking_updated", (updatedBooking: Booking) => {
      setBookings((prevBookings) =>
        prevBookings.map((b) =>
          b.id === updatedBooking.id ? updatedBooking : b
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/me");
      if (!response.ok) {
        navigate("/");
        return;
      }
      const user = await response.json();
      setUserEmail(user.email);
      setUserId(user.id);
      // Check if user is a provider (has isProvider flag)
      if (user.isProvider !== undefined) {
        setIsProvider(user.isProvider);
      }
      // For backward compatibility, also check userType
      if (user.userType === "provider" && !user.isClient) {
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
      // setFilteredServices(data);
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

  /*
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
  */

  // Haversine formula to calculate distance between two coordinates
  /*
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
  */

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

  const verifyPayment = async (sessionId: string) => {
    try {
      const response = await fetch(
        `/api/verify-payment?session_id=${sessionId}`
      );
      const data = await response.json();
      if (response.ok) {
        alert(
          "Pagamento autorizzato! La prenotazione è confermata. I fondi saranno prelevati solo al completamento del servizio."
        );
        loadBookings();
        navigate("/client-dashboard");
      } else {
        alert(data.error || "Errore nella verifica del pagamento");
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert("Errore di connessione durante la verifica del pagamento");
    }
  };

  /*
  const handlePayment = async (bookingId: string) => {
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        const data = await response.json();
        alert(data.error || "Errore nell'inizializzazione del pagamento");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Errore di connessione");
    }
  };
  */

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
                {booking.preferredTime && (
                  <p>
                    <strong>Orario Preferito:</strong> {booking.preferredTime}
                  </p>
                )}
                {booking.address && (
                  <p>
                    <strong>Indirizzo:</strong> {booking.address}
                  </p>
                )}
                {booking.clientPhone && (
                  <p>
                    <strong>Telefono:</strong> {booking.clientPhone}
                  </p>
                )}
                <p>
                  <strong>Importo:</strong>{" "}
                  <span className="price">€{booking.amount.toFixed(2)}</span>
                </p>
                <p>
                  <strong>Fornitore:</strong> {booking.providerEmail}
                </p>
                {booking.notes && (
                  <p>
                    <strong>Note:</strong> {booking.notes}
                  </p>
                )}
                <p>
                  <strong>Stato:</strong>{" "}
                  <span className={`status ${booking.status}`}>
                    {booking.status === "pending"
                      ? "In attesa"
                      : booking.status === "completed"
                      ? "Completato"
                      : "Annullato"}
                  </span>
                </p>
                <p>
                  <strong>Pagamento:</strong>{" "}
                  <span className={`status ${booking.paymentStatus}`}>
                    {booking.paymentStatus === "held_in_escrow"
                      ? "Trattenuto in Escrow"
                      : booking.paymentStatus === "authorized"
                      ? "Autorizzato (In attesa)"
                      : booking.paymentStatus === "released"
                      ? "Rilasciato al Fornitore"
                      : "Non Pagato"}
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
                <div className="button-group">
                  <button
                    onClick={() => {
                      navigate(`/messages?bookingId=${booking.id}`);
                    }}
                    className="btn btn-chat"
                  >
                    💬 Apri Chat
                  </button>
                  {booking.status === "completed" && (
                    <button
                      onClick={() => {
                        setReviewBooking(booking);
                        setShowReviewModal(true);
                      }}
                      className="btn btn-review"
                    >
                      ⭐ Lascia una Recensione
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toast Notifications Container */}
      <div className="toast-container">
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={() =>
              setNotifications((prev) =>
                prev.filter((n) => n.id !== notification.id)
              )
            }
          />
        ))}
      </div>

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

      {/* Review Modal */}
      {showReviewModal && reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={() => {
            setShowReviewModal(false);
            setReviewBooking(null);
          }}
          onReviewSubmit={() => {
            setShowReviewModal(false);
            setReviewBooking(null);
            loadBookings(); // Refresh bookings to hide the review button if already reviewed
          }}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
