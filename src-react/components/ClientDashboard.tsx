import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ChatModal from "./ChatModal";
import BecomeProviderModal from "./BecomeProviderModal";
import { authService } from "../services/authService";
import { bookingService, Booking } from "../services/bookingService";
import "../styles/ClientDashboard.css";

interface ClientDashboardProps {
  // googleMapsApiKey removed
}

const ClientDashboard: React.FC<ClientDashboardProps> = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showBecomeProviderModal, setShowBecomeProviderModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
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

  const checkAuth = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
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

  const loadBookings = async () => {
    try {
      const data = await bookingService.getMyBookings();
      setBookings(data);
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  };

  const verifyPayment = async (sessionId: string) => {
    try {
      await bookingService.verifyPayment(sessionId);
      alert(
        "Pagamento confermato! La prenotazione è stata creata con successo ed è ora in escrow."
      );
      loadBookings();
      navigate("/client-dashboard");
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      alert(error.message || "Errore nella verifica del pagamento");
    }
  };

  const handlePayment = async (bookingId: string) => {
    try {
      const { url } = await bookingService.createCheckoutSession(bookingId);
      window.location.href = url;
    } catch (error: any) {
      console.error("Payment error:", error);
      alert(error.message || "Errore nell'inizializzazione del pagamento");
    }
  };

  return (
    <div className="client-dashboard">
      <div className="dashboard-header">
        <h1>🏠 Dashboard Cliente</h1>
        <div className="header-actions">
          {!isProvider && (
            <button
              onClick={() => setShowBecomeProviderModal(true)}
              className="btn btn-provider"
            >
              🎯 Diventa Fornitore
            </button>
          )}
          {isProvider && (
            <button
              onClick={() => navigate("/provider-dashboard")}
              className="btn btn-secondary"
            >
              📊 Dashboard Fornitore
            </button>
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
                    {booking.status === "pending" ? "In attesa" : "Completato"}
                  </span>
                </p>
                <p>
                  <strong>Pagamento:</strong>{" "}
                  <span className={`status ${booking.paymentStatus}`}>
                    {booking.paymentStatus === "held_in_escrow"
                      ? "Trattenuto in Escrow"
                      : booking.paymentStatus === "released"
                      ? "Rilasciato al Fornitore"
                      : "Non Pagato"}
                  </span>
                </p>
                {booking.paymentStatus === "unpaid" && (
                  <button
                    onClick={() => handlePayment(booking.id)}
                    className="btn btn-primary"
                    style={{ marginRight: "10px", marginBottom: "10px" }}
                  >
                    💳 Paga Ora
                  </button>
                )}
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

      {/* Chat Modal */}
      {showChatModal && selectedBooking && currentUser && (
        <ChatModal
          bookingId={selectedBooking.id}
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedBooking(null);
          }}
          currentUserType="client"
          otherPartyEmail={selectedBooking.providerEmail}
          userId={currentUser.id}
          userEmail={currentUser.email}
        />
      )}

      {/* Become Provider Modal */}
      <BecomeProviderModal
        isOpen={showBecomeProviderModal}
        onClose={() => setShowBecomeProviderModal(false)}
      />
    </div>
  );
};

export default ClientDashboard;
