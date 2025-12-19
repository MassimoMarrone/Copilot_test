import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ReviewModal from "../components/ReviewModal";
import { bookingService, Booking } from "../services/bookingService";
import "../styles/BookingsPage.css";

const getBookingPhotoUrls = (booking: Booking): string[] => {
  const urls: string[] = [];

  const addUrl = (value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!urls.includes(trimmed)) urls.push(trimmed);
  };

  const parseJsonArrayString = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        parsed.forEach(addUrl);
      }
    } catch {
      // ignore
    }
  };

  if ((booking as any).photoProofs) {
    parseJsonArrayString((booking as any).photoProofs);
  }

  if (
    urls.length === 0 &&
    typeof (booking as any).photoProof === "string" &&
    (booking as any).photoProof.trim().startsWith("[")
  ) {
    parseJsonArrayString((booking as any).photoProof);
  }

  if (urls.length === 0) {
    addUrl((booking as any).photoProof);
  }

  return urls;
};

const BookingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = React.useRef<IntersectionObserver | null>(null);
  const lastBookingElementRef = React.useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    loadBookings();
  }, [page]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getMyBookings(page);
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setBookings((prev) => {
          // Avoid duplicates
          const newBookings = data.filter(
            (newB) => !prev.some((prevB) => prevB.id === newB.id)
          );
          return [...prev, ...newBookings];
        });
        if (data.length < 10) setHasMore(false);
      }
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
      case "confirmed":
      case "accepted":
        return "Confermato";
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

  const [activeFilter, setActiveFilter] = useState("all");

  const filteredBookings = bookings.filter((booking) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "upcoming")
      return booking.status === "pending" || booking.status === "confirmed";
    return booking.status === activeFilter;
  });

  return (
    <div className="bookings-page">
      <div className="page-header">
        <h1>Le Mie Prenotazioni</h1>
      </div>

      <div className="bookings-filters">
        <button
          className={`filter-btn ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          Tutte
        </button>
        <button
          className={`filter-btn ${
            activeFilter === "upcoming" ? "active" : ""
          }`}
          onClick={() => setActiveFilter("upcoming")}
        >
          Prossime
        </button>
        <button
          className={`filter-btn ${
            activeFilter === "completed" ? "active" : ""
          }`}
          onClick={() => setActiveFilter("completed")}
        >
          Completate
        </button>
        <button
          className={`filter-btn ${
            activeFilter === "cancelled" ? "active" : ""
          }`}
          onClick={() => setActiveFilter("cancelled")}
        >
          Cancellate
        </button>
      </div>

      <div className="bookings-list">
        {filteredBookings.length === 0 && !loading ? (
          <div className="empty-state">
            <p>Nessuna prenotazione trovata in questa categoria.</p>
            {activeFilter === "all" && (
              <a href="/services" className="btn-browse">
                Esplora Servizi
              </a>
            )}
          </div>
        ) : (
          filteredBookings.map((booking, index) => {
            if (filteredBookings.length === index + 1) {
              return (
                <div
                  ref={lastBookingElementRef}
                  key={booking.id}
                  className="booking-card"
                >
                  <BookingCardContent
                    booking={booking}
                    navigate={navigate}
                    setReviewBooking={setReviewBooking}
                    setShowReviewModal={setShowReviewModal}
                    getStatusLabel={getStatusLabel}
                    getPaymentStatusLabel={getPaymentStatusLabel}
                  />
                </div>
              );
            } else {
              return (
                <div key={booking.id} className="booking-card">
                  <BookingCardContent
                    booking={booking}
                    navigate={navigate}
                    setReviewBooking={setReviewBooking}
                    setShowReviewModal={setShowReviewModal}
                    getStatusLabel={getStatusLabel}
                    getPaymentStatusLabel={getPaymentStatusLabel}
                  />
                </div>
              );
            }
          })
        )}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span className="loading-text">Caricamento...</span>
          </div>
        )}
      </div>

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
            // Reload current page or just update local state
            // For simplicity, we might just update the specific booking in state
            setBookings((prev) =>
              prev.map((b) =>
                b.id === reviewBooking.id ? { ...b, hasReview: true } : b
              )
            );
          }}
        />
      )}
    </div>
  );
};

// Helper component to avoid repetition
const BookingCardContent = ({
  booking,
  navigate,
  setReviewBooking,
  setShowReviewModal,
  getStatusLabel,
  getPaymentStatusLabel,
}: any) => (
  <>
    <div className="booking-header">
      <div className="booking-title-section">
        <h3>{booking.serviceTitle}</h3>
        <span className="booking-id">#{booking.id.slice(-6)}</span>
      </div>
      <span className={`status-badge ${booking.status}`}>
        {getStatusLabel(booking.status)}
      </span>
    </div>

    <div className="booking-details-grid">
      <div className="detail-item">
        <span className="detail-icon">📅</span>
        <div className="detail-content">
          <span className="detail-label">Data</span>
          <span className="detail-value">
            {new Date(booking.date).toLocaleDateString("it-IT", {
              weekday: "short",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
      </div>

      {booking.preferredTime && (
        <div className="detail-item">
          <span className="detail-icon">⏰</span>
          <div className="detail-content">
            <span className="detail-label">Orario</span>
            <span className="detail-value">{booking.preferredTime}</span>
          </div>
        </div>
      )}

      <div className="detail-item">
        <span className="detail-icon">💶</span>
        <div className="detail-content">
          <span className="detail-label">Prezzo</span>
          <span className="detail-value">€{booking.amount.toFixed(2)}</span>
        </div>
      </div>

      <div className="detail-item">
        <span className="detail-icon">👤</span>
        <div className="detail-content">
          <span className="detail-label">Fornitore</span>
          <span className="detail-value">{booking.providerEmail}</span>
        </div>
      </div>
    </div>

    <div className="booking-footer">
      <div className="payment-status-container">
        <span className={`payment-dot ${booking.paymentStatus}`}></span>
        <span className="payment-text">
          {getPaymentStatusLabel(booking.paymentStatus)}
        </span>
      </div>

      <div className="booking-actions">
        <button
          onClick={() => navigate(`/messages?bookingId=${booking.id}`)}
          className="btn-chat"
        >
          💬 Chat
        </button>
        {booking.status === "completed" && !booking.hasReview && (
          <button
            onClick={() => {
              setReviewBooking(booking);
              setShowReviewModal(true);
            }}
            className="btn-review"
          >
            ⭐ Recensisci
          </button>
        )}
        {booking.status === "completed" && booking.hasReview && (
          <span className="badge-reviewed">✅ Recensito</span>
        )}
      </div>
    </div>

    {(() => {
      const photoUrls = getBookingPhotoUrls(booking);
      if (booking.status !== "awaiting_confirmation") return null;
      if (photoUrls.length === 0) return null;

      return (
        <div className="photo-proof" style={{ marginTop: "12px" }}>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>Foto del Servizio:</strong>
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {photoUrls.map((url, index) => (
              <a
                key={`${booking.id}-photo-${index}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={url}
                  alt={`Foto del servizio ${index + 1}`}
                  style={{
                    width: "120px",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: "8px",
                  }}
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      );
    })()}
  </>
);

export default BookingsPage;
