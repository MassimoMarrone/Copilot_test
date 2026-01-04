import React from "react";
import { Booking } from "../../types";
import {
  CLEANING_PRODUCTS,
  getCleaningProductLabel,
} from "../../constants/cleaningProducts";

interface BookingListProps {
  bookings: Booking[];
  onAccept: (booking: Booking) => void;
  onStart: (booking: Booking) => void;
  onComplete: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onChat: (booking: Booking) => void;
}

const BookingList: React.FC<BookingListProps> = ({
  bookings,
  onAccept,
  onStart,
  onComplete,
  onCancel,
  onChat,
}) => {
  const [nowTs, setNowTs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const getAcceptanceCountdownLabel = (deadline?: string) => {
    if (!deadline) return null;
    const deadlineTs = new Date(deadline).getTime();
    if (Number.isNaN(deadlineTs)) return null;

    const remainingMs = deadlineTs - nowTs;
    if (remainingMs <= 0) return "Scaduta";

    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
    if (remainingHours <= 1) return "Scade tra meno di 1 ora";
    return `Scade tra ${remainingHours} ore`;
  };

  const parseJsonArray = (value?: string): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((x) => typeof x === "string") as string[];
      }
    } catch {
      // ignore
    }
    return [];
  };

  const parseSelectedExtras = (
    value?: string
  ): { name: string; price?: number }[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x) => x && typeof x === "object")
        .map((x: any) => ({
          name: typeof x.name === "string" ? x.name : String(x.name ?? ""),
          price: typeof x.price === "number" ? x.price : undefined,
        }))
        .filter((x) => x.name.trim().length > 0);
    } catch {
      return [];
    }
  };

  const formatDurationMinutes = (minutes?: number | null): string | null => {
    if (
      typeof minutes !== "number" ||
      !Number.isFinite(minutes) ||
      minutes <= 0
    ) {
      return null;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours <= 0) return `${mins} min`;
    if (mins === 0) return `${hours} h`;
    return `${hours} h ${mins} min`;
  };

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

          {(booking.startTime || booking.endTime) && (
            <p>
              <strong>Orario:</strong> {booking.startTime || "?"}–
              {booking.endTime || "?"}
            </p>
          )}

          {booking.preferredTime && (
            <p>
              <strong>Orario Preferito:</strong> {booking.preferredTime}
            </p>
          )}

          {booking.squareMetersRange && (
            <p>
              <strong>Metri quadri (fascia):</strong>{" "}
              {booking.squareMetersRange}
            </p>
          )}

          {typeof booking.windowsCount === "number" && (
            <p>
              <strong>Finestre:</strong> {booking.windowsCount}
            </p>
          )}

          {formatDurationMinutes(booking.estimatedDuration) && (
            <p>
              <strong>Durata stimata:</strong>{" "}
              {formatDurationMinutes(booking.estimatedDuration)}
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
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#1557b0")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#1a73e8")
                }
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

          {(() => {
            const extras = parseSelectedExtras((booking as any).selectedExtras);
            if (extras.length === 0) return null;
            return (
              <div style={{ marginTop: "10px" }}>
                <p style={{ marginBottom: "6px" }}>
                  <strong>Extra richiesti dal cliente:</strong>
                </p>
                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                  {extras.map((e, idx) => (
                    <li key={`${e.name}-${idx}`}>
                      {e.name}
                      {typeof e.price === "number"
                        ? ` (+€${e.price.toFixed(2)})`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {(() => {
            const products = parseJsonArray((booking as any).clientProducts);
            if (products.length === 0) return null;

            const allProductIds = CLEANING_PRODUCTS.map((p) => p.id);
            const missing = allProductIds.filter(
              (id) => !products.includes(id)
            );

            return (
              <div style={{ marginTop: "10px" }}>
                <p style={{ marginBottom: "6px" }}>
                  <strong>Prodotti presenti in casa (cliente):</strong>
                </p>
                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                  {products.map((p, idx) => (
                    <li key={`${p}-${idx}`}>{getCleaningProductLabel(p)}</li>
                  ))}
                </ul>

                {missing.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <p style={{ marginBottom: "6px" }}>
                      <strong>Prodotti mancanti (da portare):</strong>
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "18px" }}>
                      {missing.map((id) => (
                        <li key={id}>{getCleaningProductLabel(id)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
          <p>
            <strong>Importo:</strong>{" "}
            <span className="price">€{booking.amount.toFixed(2)}</span>
          </p>
          <p>
            <strong>Stato:</strong>{" "}
            <span className={`status ${booking.status}`}>
              {booking.status === "pending"
                ? "Da accettare"
                : booking.status === "confirmed"
                ? "Confermato"
                : booking.status === "in_progress"
                ? "In corso"
                : booking.status === "awaiting_confirmation"
                ? "In attesa conferma cliente"
                : booking.status === "disputed"
                ? "In disputa"
                : booking.status === "completed"
                ? "Completato"
                : booking.status === "cancelled"
                ? "Cancellato"
                : booking.status}
            </span>
          </p>

          {booking.startedAt && (
            <p>
              <strong>Avviato:</strong>{" "}
              {new Date(booking.startedAt).toLocaleString("it-IT")}
            </p>
          )}
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

          {booking.status === "pending" && !booking.acceptedAt && (
            <div className="booking-actions">
              {booking.acceptanceDeadline && (
                <p style={{ margin: "8px 0", fontSize: "14px" }}>
                  <strong>Scadenza accettazione:</strong>{" "}
                  {new Date(booking.acceptanceDeadline).toLocaleString("it-IT")}
                </p>
              )}
              {booking.acceptanceDeadline && (
                <p style={{ margin: "8px 0", fontSize: "14px" }}>
                  <strong>
                    {getAcceptanceCountdownLabel(booking.acceptanceDeadline)}
                  </strong>
                </p>
              )}
              <button
                onClick={() => onAccept(booking)}
                className="btn btn-primary"
              >
                Accetta Prenotazione
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

          {booking.status !== "cancelled" &&
            booking.status !== "completed" &&
            booking.status !== "pending" && (
              <div className="booking-actions">
                {booking.status === "confirmed" && !booking.startedAt && (
                  <button
                    onClick={() => onStart(booking)}
                    className="btn btn-primary"
                    style={{ marginRight: "10px" }}
                  >
                    Avvia Servizio
                  </button>
                )}
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
