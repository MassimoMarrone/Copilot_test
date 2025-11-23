import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import AddressAutocomplete from "./AddressAutocomplete";
import ToastNotification, { Notification } from "./ToastNotification";
import NotificationCenter from "./NotificationCenter";
import ChatModal from "./ChatModal";
import UserMenu from "./UserMenu";
import "../styles/ProviderDashboard.css";
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
  createdAt: string;
}

interface Booking {
  id: string;
  serviceTitle: string;
  date: string;
  amount: number;
  clientEmail: string;
  status: string;
  paymentStatus: string;
  photoProof?: string;
  clientPhone?: string;
  preferredTime?: string;
  notes?: string;
  address?: string;
}

const ProviderDashboard: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastNotification, setLastNotification] = useState<Notification | null>(
    null
  );

  // New Service Form State
  const [newService, setNewService] = useState({
    title: "",
    description: "",
    price: "",
    address: "",
    latitude: 0,
    longitude: 0,
  });

  // Complete Booking Form State
  const [photoProof, setPhotoProof] = useState<File | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadServices();
    loadBookings();
  }, []);

  // Socket.IO connection for real-time updates
  useEffect(() => {
    if (!userId) return;

    const socket = io("http://localhost:3000");

    socket.on("connect", () => {
      console.log("Connected to socket server for updates");
      socket.emit("join_user_room", userId);
    });

    socket.on("new_notification", (notification: Notification) => {
      setNotifications((prev) => [...prev, notification]);
      setLastNotification(notification);
    });

    socket.on("booking_created", (newBooking: Booking) => {
      setBookings((prevBookings) => [newBooking, ...prevBookings]);
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
      // Check if user is a provider (has isProvider flag or userType is provider)
      const isProviderUser = user.isProvider || user.userType === "provider";
      if (!isProviderUser) {
        navigate("/client-dashboard");
      }
    } catch (error) {
      navigate("/");
    }
  };

  const loadServices = async () => {
    try {
      const response = await fetch("/api/my-services");
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
    }
  };

  const loadBookings = async () => {
    try {
      const response = await fetch("/api/provider-bookings");
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error("Error loading bookings:", error);
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

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();

    const serviceData: any = {
      title: newService.title,
      description: newService.description,
      price: parseFloat(newService.price),
    };

    if (newService.address) {
      serviceData.address = newService.address;
      if (newService.latitude && newService.longitude) {
        serviceData.latitude = newService.latitude;
        serviceData.longitude = newService.longitude;
      }
    }

    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceData),
      });

      if (response.ok) {
        alert("Servizio creato con successo!");
        setShowServiceModal(false);
        setNewService({
          title: "",
          description: "",
          price: "",
          address: "",
          latitude: 0,
          longitude: 0,
        });
        loadServices();
      } else {
        const data = await response.json();
        alert(data.error || "Errore nella creazione del servizio");
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  };

  const handleCompleteBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !photoProof) {
      alert("Devi caricare una foto prova del servizio completato");
      return;
    }

    const formData = new FormData();
    formData.append("photo", photoProof);

    try {
      const response = await fetch(
        `/api/bookings/${selectedBooking.id}/complete`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        alert(
          "Servizio completato! Il pagamento è stato rilasciato dall'escrow."
        );
        setShowCompleteModal(false);
        setPhotoProof(null);
        setSelectedBooking(null);
        loadBookings();
      } else {
        const data = await response.json();
        alert(data.error || "Errore nel completamento del servizio");
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  };

  return (
    <div className="provider-dashboard">
      <div className="dashboard-header">
        <h1>🛠️ Dashboard Fornitore</h1>
        <button
          className="btn-add-service"
          onClick={() => setShowServiceModal(true)}
        >
          + Nuovo Servizio
        </button>
      </div>

      <div className="dashboard-section">
        <h2>📦 I Miei Servizi</h2>
        <div className="services-grid">
          {services.length === 0 ? (
            <div className="empty-state">
              <p>
                Non hai ancora creato servizi. Clicca sul pulsante sopra per
                aggiungerne uno.
              </p>
            </div>
          ) : (
            services.map((service) => (
              <div key={service.id} className="service-card">
                <h3>{service.title}</h3>
                <p className="service-description">{service.description}</p>
                {service.address && (
                  <p className="service-location">📍 {service.address}</p>
                )}
                <p className="service-price">€{service.price.toFixed(2)}</p>
                <p>
                  <small>
                    Creato il:{" "}
                    {new Date(service.createdAt).toLocaleDateString("it-IT")}
                  </small>
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="dashboard-section">
        <h2>📅 Prenotazioni Ricevute</h2>
        <div className="bookings-list">
          {bookings.length === 0 ? (
            <div className="empty-state">
              <p>Non hai ancora ricevuto prenotazioni.</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <h3>{booking.serviceTitle}</h3>
                <p>
                  <strong>Cliente:</strong> {booking.clientEmail}
                </p>
                {booking.clientPhone && (
                  <p>
                    <strong>Telefono Cliente:</strong> {booking.clientPhone}
                  </p>
                )}
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
                {booking.notes && (
                  <p>
                    <strong>Note del Cliente:</strong> {booking.notes}
                  </p>
                )}
                <p>
                  <strong>Importo:</strong>{" "}
                  <span className="price">€{booking.amount.toFixed(2)}</span>
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
                      : booking.paymentStatus === "authorized"
                      ? "Autorizzato (Congelato)"
                      : booking.paymentStatus === "released"
                      ? "Rilasciato"
                      : booking.paymentStatus === "refunded"
                      ? "Rimborsato"
                      : "Non pagato"}
                  </span>
                </p>

                {booking.status !== "cancelled" &&
                  booking.status !== "completed" && (
                    <div className="booking-actions">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowCompleteModal(true);
                        }}
                        className="btn btn-success"
                      >
                        Completa Servizio & Rilascia Payout
                      </button>
                      <button
                        className="btn-cancel"
                        style={{
                          backgroundColor: "#dc3545",
                          color: "white",
                          marginLeft: "10px",
                          padding: "8px 16px",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              "Sei sicuro di voler cancellare questa prenotazione? Se il pagamento è stato effettuato, verrà rimborsato."
                            )
                          )
                            return;

                          try {
                            const response = await fetch(
                              `/api/bookings/${booking.id}/cancel`,
                              {
                                method: "POST",
                              }
                            );
                            if (response.ok) {
                              alert("Prenotazione cancellata con successo");
                              loadBookings();
                            } else {
                              const data = await response.json();
                              alert(
                                data.error ||
                                  "Errore durante la cancellazione della prenotazione"
                              );
                            }
                          } catch (error) {
                            alert("Errore di connessione");
                          }
                        }}
                      >
                        Cancella
                      </button>
                    </div>
                  )}

                {booking.status === "completed" && (
                  <div className="completed-badge">✅ Completato</div>
                )}
                {booking.status === "cancelled" && (
                  <div
                    className="cancelled-badge"
                    style={{
                      color: "#dc3545",
                      fontWeight: "bold",
                      marginTop: "10px",
                    }}
                  >
                    ❌ Cancellato
                  </div>
                )}

                {booking.photoProof && (
                  <div className="photo-proof">
                    <p>
                      <strong>Prova Fotografica Caricata:</strong>
                    </p>
                    <img
                      src={booking.photoProof}
                      alt="Prova del servizio completato"
                    />
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowChatModal(true);
                  }}
                  className="btn btn-chat"
                >
                  💬 Apri Chat
                </button>
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

      {/* Create Service Modal */}
      {showServiceModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowServiceModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowServiceModal(false)}
            >
              &times;
            </button>
            <h2>Crea Nuovo Servizio</h2>
            <form onSubmit={handleCreateService}>
              <div className="form-group">
                <label>Titolo</label>
                <input
                  type="text"
                  value={newService.title}
                  onChange={(e) =>
                    setNewService({ ...newService, title: e.target.value })
                  }
                  required
                  minLength={3}
                  maxLength={200}
                />
              </div>
              <div className="form-group">
                <label>Descrizione</label>
                <textarea
                  value={newService.description}
                  onChange={(e) =>
                    setNewService({
                      ...newService,
                      description: e.target.value,
                    })
                  }
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </div>
              <div className="form-group">
                <label>Prezzo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newService.price}
                  onChange={(e) =>
                    setNewService({ ...newService, price: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Indirizzo (Opzionale)</label>
                <AddressAutocomplete
                  onSelect={(loc) => {
                    setNewService({
                      ...newService,
                      address: loc.address,
                      latitude: loc.lat,
                      longitude: loc.lng,
                    });
                  }}
                  initialValue={newService.address}
                />
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-primary">
                  Crea Servizio
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowServiceModal(false)}
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Booking Modal */}
      {showCompleteModal && selectedBooking && (
        <div
          className="modal-overlay"
          onClick={() => setShowCompleteModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowCompleteModal(false)}
            >
              &times;
            </button>
            <h2>Completa Servizio</h2>
            <p>
              Carica una foto come prova del lavoro completato per sbloccare il
              pagamento.
            </p>
            <form onSubmit={handleCompleteBooking}>
              <div className="form-group">
                <label>Foto Prova</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPhotoProof(e.target.files[0]);
                    }
                  }}
                  required
                />
              </div>
              <div className="button-group">
                <button type="submit" className="btn btn-success">
                  Conferma Completamento
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCompleteModal(false)}
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && selectedBooking && (
        <ChatModal
          bookingId={selectedBooking.id}
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedBooking(null);
          }}
          currentUserType="provider"
          otherPartyEmail={selectedBooking.clientEmail}
          userId={userId}
          userEmail={userEmail}
        />
      )}
    </div>
  );
};

export default ProviderDashboard;
