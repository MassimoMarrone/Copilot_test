import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ChatModal from "./ChatModal";
import BecomeProviderModal from "./BecomeProviderModal";
import ReviewModal from "./ReviewModal";
import BookingCalendar from "./BookingCalendar";
import { authService, User } from "../services/authService";
import { bookingService, Booking } from "../services/bookingService";
import "../styles/ClientDashboard.css";

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

  if (booking.photoProofs) {
    parseJsonArrayString(booking.photoProofs);
  }

  // Bug-tolerant: in alcuni casi photoProof potrebbe contenere un JSON array
  if (
    urls.length === 0 &&
    typeof booking.photoProof === "string" &&
    booking.photoProof.trim().startsWith("[")
  ) {
    parseJsonArrayString(booking.photoProof);
  }

  if (urls.length === 0) {
    addUrl(booking.photoProof);
  }

  return urls;
};

interface ClientDashboardProps {
  // googleMapsApiKey removed
}

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalSpent: number;
}

const ClientDashboard: React.FC<ClientDashboardProps> = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showBecomeProviderModal, setShowBecomeProviderModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isProvider, setIsProvider] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "completed" | "all" | "calendar"
  >("upcoming");
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
  });
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

      // Calculate stats
      const completed = data.filter((b: Booking) => b.status === "completed");
      const pending = data.filter((b: Booking) => b.status === "pending");
      const totalSpent = completed.reduce(
        (sum: number, b: Booking) => sum + b.amount,
        0
      );

      setStats({
        totalBookings: data.length,
        pendingBookings: pending.length,
        completedBookings: completed.length,
        totalSpent,
      });
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

      // Handle race condition - slot no longer available
      if (
        error.code === "SLOT_NO_LONGER_AVAILABLE" ||
        error.message?.includes("slot")
      ) {
        alert(
          "⚠️ Lo slot selezionato non è più disponibile.\n\n" +
            "Un altro utente ha completato la prenotazione prima di te.\n" +
            "Il pagamento verrà rimborsato automaticamente entro 5-10 giorni lavorativi.\n\n" +
            "Ti invitiamo a selezionare un altro orario."
        );
        navigate("/services");
      } else {
        alert(error.message || "Errore nella verifica del pagamento");
      }
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

  // Confirm service completion - releases payment to provider
  const handleConfirmService = async (booking: Booking) => {
    if (
      !window.confirm(
        "Confermi che il servizio è stato completato correttamente?\n\n" +
          "Il pagamento verrà rilasciato al fornitore."
      )
    )
      return;

    try {
      await bookingService.confirmServiceCompletion(booking.id);
      alert(
        "Servizio confermato! Il pagamento è stato rilasciato al fornitore."
      );
      loadBookings();
    } catch (error: any) {
      alert(error.message || "Errore nella conferma del servizio");
    }
  };

  // Open dispute - blocks payment, notifies admin
  const handleOpenDispute = async (booking: Booking) => {
    const reason = window.prompt(
      "Descrivi il problema riscontrato (min. 10 caratteri):\n\n" +
        "Un amministratore verificherà la situazione e ti contatterà."
    );

    if (!reason) return;

    if (reason.trim().length < 10) {
      alert("La motivazione deve essere di almeno 10 caratteri");
      return;
    }

    try {
      await bookingService.openDispute(booking.id, reason);
      alert(
        "Controversia aperta. Un amministratore verificherà la situazione e ti contatterà."
      );
      loadBookings();
    } catch (error: any) {
      alert(error.message || "Errore nell'apertura della controversia");
    }
  };

  const getFilteredBookings = () => {
    switch (activeTab) {
      case "upcoming":
        // Include pending and awaiting_confirmation in upcoming
        return bookings.filter(
          (b) => b.status === "pending" || b.status === "awaiting_confirmation"
        );
      case "completed":
        return bookings.filter((b) => b.status === "completed");
      default:
        return bookings;
    }
  };

  return (
    <div className="client-dashboard">
      <div className="dashboard-header">
        <div className="header-info">
          <h1>
            Ciao,{" "}
            {currentUser?.firstName || currentUser?.displayName || "Utente"}! 👋
          </h1>
          <p className="header-subtitle">
            Gestisci le tue prenotazioni e servizi
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => navigate("/services")}
            className="btn btn-primary"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Cerca Servizi
          </button>
          {!isProvider && (
            <button
              onClick={() => setShowBecomeProviderModal(true)}
              className="btn btn-provider"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Diventa Fornitore
            </button>
          )}
          {isProvider && (
            <button
              onClick={() => navigate("/provider-dashboard")}
              className="btn btn-secondary"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Dashboard Fornitore
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalBookings}</span>
            <span className="stat-label">Prenotazioni Totali</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.pendingBookings}</span>
            <span className="stat-label">In Attesa</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.completedBookings}</span>
            <span className="stat-label">Completate</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">€{stats.totalSpent.toFixed(0)}</span>
            <span className="stat-label">Totale Speso</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Prossime ({bookings.filter((b) => b.status === "pending").length})
        </button>
        <button
          className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Completate ({bookings.filter((b) => b.status === "completed").length})
        </button>
        <button
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          Tutte ({bookings.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "calendar" ? "active" : ""}`}
          onClick={() => setActiveTab("calendar")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="9" y1="16" x2="9.01" y2="16" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
            <line x1="15" y1="16" x2="15.01" y2="16" />
          </svg>
          Calendario
        </button>
      </div>

      {activeTab === "calendar" ? (
        <div className="dashboard-section">
          <BookingCalendar
            events={bookings.map((booking) => ({
              id: booking.id,
              title: booking.serviceTitle,
              date: booking.date,
              time: booking.preferredTime,
              status: booking.status,
              amount: booking.amount,
              providerName: booking.providerEmail?.split("@")[0],
              address: booking.address,
            }))}
            onEventClick={(event) => {
              const booking = bookings.find((b) => b.id === event.id);
              if (booking) {
                setSelectedBooking(booking);
              }
            }}
            userType="client"
          />
        </div>
      ) : (
        <div className="dashboard-section">
          <div className="bookings-list">
            {getFilteredBookings().length === 0 ? (
              <div className="empty-state">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ccc"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <h3>Nessuna prenotazione</h3>
                <p>Non hai ancora prenotazioni in questa categoria.</p>
                <button
                  onClick={() => navigate("/services")}
                  className="btn btn-primary"
                >
                  Cerca Servizi
                </button>
              </div>
            ) : (
              getFilteredBookings().map((booking) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-card-header">
                    <div className="booking-service-info">
                      <h3>{booking.serviceTitle}</h3>
                      <span className="provider-name">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        {booking.providerEmail}
                      </span>
                    </div>
                    <div className="booking-status-badges">
                      <span className={`status-badge status-${booking.status}`}>
                        {booking.status === "pending"
                          ? "In attesa"
                          : booking.status === "awaiting_confirmation"
                          ? "⏳ Da confermare"
                          : booking.status === "disputed"
                          ? "⚠️ Controversia"
                          : "Completato"}
                      </span>
                      <span
                        className={`payment-badge payment-${booking.paymentStatus}`}
                      >
                        {booking.paymentStatus === "held_in_escrow"
                          ? "💳 In Escrow"
                          : booking.paymentStatus === "released"
                          ? "✅ Pagato"
                          : "⏳ Non Pagato"}
                      </span>
                    </div>
                  </div>

                  <div className="booking-card-body">
                    <div className="booking-details-grid">
                      <div className="booking-detail">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>
                          {new Date(booking.date).toLocaleDateString("it-IT", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                      </div>
                      {booking.preferredTime && (
                        <div className="booking-detail">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>{booking.preferredTime}</span>
                        </div>
                      )}
                      {booking.address && (
                        <div className="booking-detail">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{booking.address}</span>
                        </div>
                      )}
                      <div className="booking-detail booking-price">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        <span className="price">
                          €{booking.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="booking-notes">
                        <strong>Note:</strong> {booking.notes}
                      </div>
                    )}
                  </div>

                  <div className="booking-card-footer">
                    {booking.paymentStatus === "unpaid" && (
                      <button
                        onClick={() => handlePayment(booking.id)}
                        className="btn btn-primary"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="1"
                            y="4"
                            width="22"
                            height="16"
                            rx="2"
                            ry="2"
                          />
                          <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                        Paga Ora
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowChatModal(true);
                      }}
                      className="btn btn-chat"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Chat
                    </button>
                    {booking.status === "completed" && !booking.hasReview && (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowReviewModal(true);
                        }}
                        className="btn btn-review"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Recensisci
                      </button>
                    )}
                    {booking.hasReview && (
                      <span className="badge-reviewed">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Recensito
                      </span>
                    )}
                  </div>

                  {/* Escrow Confirmation Section */}
                  {booking.status === "awaiting_confirmation" && (
                    <div
                      className="escrow-confirmation-section"
                      style={{
                        background: "#fff3cd",
                        border: "1px solid #ffc107",
                        borderRadius: "8px",
                        padding: "16px",
                        marginTop: "16px",
                      }}
                    >
                      <h4 style={{ margin: "0 0 8px 0", color: "#856404" }}>
                        📸 Il fornitore ha completato il servizio
                      </h4>
                      <p
                        style={{
                          margin: "0 0 12px 0",
                          fontSize: "14px",
                          color: "#856404",
                        }}
                      >
                        Verifica le foto e conferma il completamento oppure apri
                        una controversia.
                        {booking.confirmationDeadline && (
                          <strong
                            style={{ display: "block", marginTop: "4px" }}
                          >
                            ⏰ Scadenza:{" "}
                            {new Date(
                              booking.confirmationDeadline
                            ).toLocaleString("it-IT")}
                          </strong>
                        )}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => handleConfirmService(booking)}
                          className="btn btn-success"
                          style={{ flex: "1", minWidth: "140px" }}
                        >
                          ✅ Conferma Servizio
                        </button>
                        <button
                          onClick={() => handleOpenDispute(booking)}
                          className="btn btn-warning"
                          style={{
                            flex: "1",
                            minWidth: "140px",
                            background: "#dc3545",
                            color: "white",
                          }}
                        >
                          ⚠️ Apri Controversia
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Disputed Status */}
                  {booking.status === "disputed" && (
                    <div
                      className="dispute-status-section"
                      style={{
                        background: "#f8d7da",
                        border: "1px solid #f5c6cb",
                        borderRadius: "8px",
                        padding: "16px",
                        marginTop: "16px",
                      }}
                    >
                      <h4 style={{ margin: "0 0 8px 0", color: "#721c24" }}>
                        ⚠️ Controversia in corso
                      </h4>
                      <p
                        style={{
                          margin: "0",
                          fontSize: "14px",
                          color: "#721c24",
                        }}
                      >
                        Un amministratore sta verificando la situazione. Ti
                        contatteremo presto.
                      </p>
                    </div>
                  )}

                  {(() => {
                    const photoUrls = getBookingPhotoUrls(booking);
                    if (booking.status !== "awaiting_confirmation") return null;
                    if (photoUrls.length === 0) return null;

                    return (
                      <div className="photo-proof">
                        <p>
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
                </div>
              ))
            )}
          </div>
        </div>
      )}

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

      {/* Review Modal */}
      {showReviewModal && selectedBooking && (
        <ReviewModal
          booking={selectedBooking}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedBooking(null);
          }}
          onReviewSubmit={() => {
            setShowReviewModal(false);
            setSelectedBooking(null);
            loadBookings();
          }}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
