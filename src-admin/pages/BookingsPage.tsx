import React, { useState, useEffect } from "react";
import { adminApi, AdminBooking } from "../services/adminApi";

const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await adminApi.getBookings();
      setBookings(data);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    booking: AdminBooking,
    newStatus: string
  ) => {
    try {
      await adminApi.updateBookingStatus(booking.id, newStatus);
      setBookings(
        bookings.map((b) =>
          b.id === booking.id ? { ...b, status: newStatus } : b
        )
      );
    } catch (error) {
      alert("Errore durante l'aggiornamento");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#27ae60";
      case "pending":
        return "#f39c12";
      case "completed":
        return "#3498db";
      case "cancelled":
        return "#e74c3c";
      default:
        return "#95a5a6";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confermata";
      case "pending":
        return "In attesa";
      case "completed":
        return "Completata";
      case "cancelled":
        return "Annullata";
      default:
        return status;
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "💳 Pagato";
      case "pending":
        return "⏳ In attesa";
      case "refunded":
        return "↩️ Rimborsato";
      default:
        return status;
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.serviceTitle.toLowerCase().includes(search.toLowerCase()) ||
      booking.clientEmail.toLowerCase().includes(search.toLowerCase()) ||
      booking.providerEmail.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Caricamento prenotazioni...</p>
      </div>
    );
  }

  return (
    <div className="bookings-page">
      <div className="page-header">
        <h1>📅 Gestione Prenotazioni</h1>
        <p>{bookings.length} prenotazioni totali</p>
      </div>

      <div className="page-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Cerca prenotazioni..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-tabs">
          {[
            { key: "all", label: "Tutte" },
            { key: "pending", label: "In attesa" },
            { key: "confirmed", label: "Confermate" },
            { key: "completed", label: "Completate" },
            { key: "cancelled", label: "Annullate" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab ${
                statusFilter === tab.key ? "active" : ""
              }`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>Servizio</th>
              <th>Cliente</th>
              <th>Provider</th>
              <th>Data/Ora</th>
              <th>Importo</th>
              <th>Pagamento</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking.id}>
                <td>
                  <strong>{booking.serviceTitle}</strong>
                </td>
                <td>{booking.clientEmail}</td>
                <td>{booking.providerEmail}</td>
                <td>
                  <div className="datetime-cell">
                    <span>
                      📅 {new Date(booking.date).toLocaleDateString("it-IT")}
                    </span>
                    {booking.startTime && (
                      <span>
                        🕐 {booking.startTime} - {booking.endTime}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="amount">€{booking.amount}</span>
                </td>
                <td>
                  <span className={`payment-status ${booking.paymentStatus}`}>
                    {getPaymentStatusLabel(booking.paymentStatus)}
                  </span>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(booking.status) }}
                  >
                    {getStatusLabel(booking.status)}
                  </span>
                </td>
                <td>
                  <select
                    className="status-select"
                    value={booking.status}
                    onChange={(e) =>
                      handleStatusChange(booking, e.target.value)
                    }
                    disabled={
                      booking.status === "cancelled" ||
                      booking.status === "completed"
                    }
                  >
                    <option value="pending">In attesa</option>
                    <option value="confirmed">Confermata</option>
                    <option value="completed">Completata</option>
                    <option value="cancelled">Annullata</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredBookings.length === 0 && (
          <div className="no-results">
            <p>Nessuna prenotazione trovata</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsPage;
