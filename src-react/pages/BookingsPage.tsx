import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ReviewModal from "../components/ReviewModal";
import { bookingService, Booking } from "../services/bookingService";
import "../styles/BookingsPage.css";

const BookingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await bookingService.getMyBookings();
      setBookings(data);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "In Attesa";
      case "completed":
        return "Completato";
      case "cancelled":
        return "Cancellato";
      default:
        return status;
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case "held_in_escrow":
        return "Trattenuto in Escrow";
      case "authorized":
        return "Autorizzato";
      case "released":
        return "Pagato";
      case "refunded":
        return "Rimborsato";
      case "unpaid":
        return "Non Pagato";
      default:
        return status;
    }
  };

  return (
    <div className="bookings-page">
      <div className="page-header">
        <h1>Le Mie Prenotazioni</h1>
      </div>

      {loading ? (
        <div className="loading-spinner">Caricamento...</div>
      ) : (
        <div className="bookings-list">
          {bookings.length === 0 ? (
            <div className="empty-state">
              <p>Non hai ancora effettuato prenotazioni.</p>
              <a href="/services" className="btn-browse">
                Esplora Servizi
              </a>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-header">
                  <h3>{booking.serviceTitle}</h3>
                  <span className={`status-badge ${booking.status}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <span className="label">Data:</span>
                    <span className="value">
                      {new Date(booking.date).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                  {booking.preferredTime && (
                    <div className="detail-row">
                      <span className="label">Orario:</span>
                      <span className="value">{booking.preferredTime}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Prezzo:</span>
                    <span className="value">€{booking.amount.toFixed(2)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Fornitore:</span>
                    <span className="value">{booking.providerEmail}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Pagamento:</span>
                    <span className="value payment-status">
                      {getPaymentStatusLabel(booking.paymentStatus)}
                    </span>
                  </div>
                </div>

                <div className="booking-actions">
                  <button
                    onClick={() =>
                      navigate(`/messages?bookingId=${booking.id}`)
                    }
                    className="btn-chat"
                  >
                    💬 Chat con Fornitore
                  </button>
                  {booking.status === "completed" && !booking.hasReview && (
                    <button
                      onClick={() => {
                        setReviewBooking(booking);
                        setShowReviewModal(true);
                      }}
                      className="btn-review"
                    >
                      ⭐ Lascia Recensione
                    </button>
                  )}
                  {booking.status === "completed" && booking.hasReview && (
                    <span className="badge-reviewed">✅ Recensito</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

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
            loadBookings();
          }}
        />
      )}
    </div>
  );
};

export default BookingsPage;
