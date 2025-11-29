import React from "react";
import { Booking } from "../../types/provider";

interface BookingListProps {
  bookings: Booking[];
  onComplete: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onChat: (booking: Booking) => void;
}

const BookingList: React.FC<BookingListProps> = ({
  bookings,
  onComplete,
  onCancel,
  onChat,
}) => {
  if (bookings.length === 0) {
    return (
      <div className="empty-state">
        <p>Non hai ancora ricevuto prenotazioni.</p>
      </div>
    );
  }

  return (
    <div className="bookings-list">
      {bookings.map((booking) => (
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
            <div style={{ marginBottom: "12px" }}>
              <p style={{ marginBottom: "8px" }}>
                <strong>Indirizzo:</strong> 📍 {booking.address}
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  booking.address
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  backgroundColor: "#1a73e8",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "14px",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1557b0")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1a73e8")}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Portami al Servizio
              </a>
            </div>
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

          {booking.status !== "cancelled" && booking.status !== "completed" && (
            <div className="booking-actions">
              <button
                onClick={() => onComplete(booking)}
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
                onClick={() => onCancel(booking)}
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

          <button onClick={() => onChat(booking)} className="btn btn-chat">
            💬 Apri Chat
          </button>
        </div>
      ))}
    </div>
  );
};

export default BookingList;
