import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import ToastNotification, { Notification } from "./ToastNotification";
import ServiceList from "./provider/ServiceList";
import BookingList from "./provider/BookingList";
import ReviewList from "./provider/ReviewList";
import ServiceModal from "./provider/ServiceModal";
import CompleteBookingModal from "./provider/CompleteBookingModal";
import AvailabilityModal from "./provider/AvailabilityModal";
import StripeConnectStatus from "./provider/StripeConnectStatus";
import BookingCalendar, { CalendarEvent } from "./BookingCalendar";
import { Service, Booking, Review } from "../types";
import { ProviderAvailability } from "./AvailabilityManager";
import { authService, User } from "../services/authService";
import { servicesService } from "../services/servicesService";
import { bookingService } from "../services/bookingService";
import { reviewService } from "../services/reviewService";
import { stripeConnectService } from "../services/stripeConnectService";
import "../styles/ProviderDashboard.css";
import "../styles/ToastNotification.css";

interface ProviderStats {
  totalServices: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalEarnings: number;
  averageRating: number;
}

const ProviderDashboard: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stripeConnected, setStripeConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "services" | "bookings" | "reviews" | "calendar"
  >("bookings");
  const [stats, setStats] = useState<ProviderStats>({
    totalServices: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
  });

  // Modal States
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceModalMode, setServiceModalMode] = useState<"create" | "edit">(
    "create"
  );
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [availabilityService, setAvailabilityService] =
    useState<Service | null>(null);

  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastNotification, setLastNotification] = useState<Notification | null>(
    null
  );

  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadServices();
    loadBookings();
    loadReviews();
    checkStripeStatus();
  }, []);

  // Check Stripe Connect status
  const checkStripeStatus = async () => {
    try {
      const status = await stripeConnectService.getAccountStatus();
      setStripeConnected(status.hasAccount && status.chargesEnabled);
    } catch (error) {
      console.error("Error checking Stripe status:", error);
      setStripeConnected(false);
    }
  };

  // Calculate stats when data changes
  useEffect(() => {
    const completed = bookings.filter((b) => b.status === "completed");
    const pending = bookings.filter((b) => b.status === "pending");
    const totalEarnings = completed.reduce((sum, b) => sum + b.amount, 0);
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    setStats({
      totalServices: services.length,
      totalBookings: bookings.length,
      pendingBookings: pending.length,
      completedBookings: completed.length,
      totalEarnings,
      averageRating: avgRating,
    });
  }, [services, bookings, reviews]);

  // Socket.IO connection for real-time updates
  useEffect(() => {
    if (!userId) return;

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
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      setUserEmail(user.email);
      setUserId(user.id);
      const isProviderUser = user.isProvider || user.userType === "provider";
      if (!isProviderUser) {
        navigate("/client-dashboard");
        return;
      }
      // Redirect to onboarding if not approved
      if (user.onboardingStatus !== "approved") {
        navigate("/provider-onboarding");
        return;
      }
    } catch (error) {
      navigate("/");
    }
  };

  const loadServices = async () => {
    try {
      const data = await servicesService.getMyServices();
      // Cast to any because types might slightly differ between frontend definitions
      setServices(data as any);
    } catch (error) {
      console.error("Error loading services:", error);
    }
  };

  const loadBookings = async () => {
    try {
      const data = await bookingService.getProviderBookings();
      setBookings(data as any);
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  };

  const loadReviews = async () => {
    try {
      const data = await reviewService.getMyReviews();
      setReviews(data as any);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const handleCreateService = async (formData: FormData) => {
    try {
      await servicesService.createService(formData);
      alert("Servizio creato con successo!");
      setShowServiceModal(false);
      loadServices();
    } catch (error: any) {
      alert(error.message || "Errore nella creazione del servizio");
    }
  };

  const handleUpdateService = async (formData: FormData) => {
    if (!editingService) return;

    try {
      await servicesService.updateService(editingService.id, formData);
      alert("Servizio aggiornato con successo!");
      setShowServiceModal(false);
      setEditingService(null);
      loadServices();
    } catch (error: any) {
      alert(error.message || "Errore nell'aggiornamento del servizio");
    }
  };

  const handleUpdateAvailability = async (
    availability: ProviderAvailability
  ) => {
    if (!availabilityService) return;

    try {
      await servicesService.updateAvailability(
        availabilityService.id,
        availability
      );
      alert("Disponibilità aggiornata con successo!");
      setAvailabilityService(null);
      loadServices();
    } catch (error: any) {
      alert(error.message || "Errore nell'aggiornamento della disponibilità");
    }
  };

  const handleCompleteBooking = async (photos: File[]) => {
    if (!selectedBooking) return;

    try {
      await bookingService.completeBooking(selectedBooking.id, photos);
      alert(
        "Servizio completato! Il cliente ha 24 ore per confermare. Dopo la conferma il pagamento verrà trasferito sul tuo account."
      );
      setShowCompleteModal(false);
      setSelectedBooking(null);
      loadBookings();
    } catch (error: any) {
      alert(error.message || "Errore nel completamento del servizio");
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (
      !window.confirm(
        "Sei sicuro di voler cancellare questa prenotazione? Se il pagamento è stato effettuato, verrà rimborsato."
      )
    )
      return;

    try {
      await bookingService.cancelBooking(booking.id);
      alert("Prenotazione cancellata con successo");
      loadBookings();
    } catch (error: any) {
      alert(
        error.message || "Errore durante la cancellazione della prenotazione"
      );
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (
      !window.confirm(
        `Sei sicuro di voler eliminare il servizio "${service.title}"? Questa azione è irreversibile.`
      )
    ) {
      return;
    }

    try {
      await servicesService.deleteService(service.id);
      alert("Servizio eliminato con successo");
      loadServices();
    } catch (error: any) {
      console.error("Error deleting service:", error);
      alert(error.message || "Errore di connessione");
    }
  };

  return (
    <div className="provider-dashboard">
      <div className="dashboard-header">
        <div className="header-info">
          <h1>
            Ciao,{" "}
            {currentUser?.firstName || currentUser?.displayName || "Fornitore"}!
            🛠️
          </h1>
          <p className="header-subtitle">
            Gestisci i tuoi servizi e prenotazioni
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/client-dashboard")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Dashboard Cliente
          </button>
          <button
            className={`btn btn-primary ${
              !stripeConnected ? "btn-disabled" : ""
            }`}
            onClick={() => {
              if (!stripeConnected) {
                alert(
                  "Devi prima collegare il tuo account Stripe per poter pubblicare servizi."
                );
                return;
              }
              setServiceModalMode("create");
              setEditingService(null);
              setShowServiceModal(true);
            }}
            title={
              !stripeConnected
                ? "Collega Stripe per pubblicare servizi"
                : "Crea un nuovo servizio"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuovo Servizio
          </button>
        </div>
      </div>

      {/* Stripe Connect Status */}
      <StripeConnectStatus onStatusChange={setStripeConnected} />

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
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalServices}</span>
            <span className="stat-label">Servizi Attivi</span>
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
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">
              €{stats.totalEarnings.toFixed(0)}
            </span>
            <span className="stat-label">Guadagni Totali</span>
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
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.averageRating.toFixed(1)}</span>
            <span className="stat-label">Valutazione Media</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === "bookings" ? "active" : ""}`}
          onClick={() => setActiveTab("bookings")}
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
          </svg>
          Prenotazioni ({bookings.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "services" ? "active" : ""}`}
          onClick={() => setActiveTab("services")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          I Miei Servizi ({services.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Recensioni ({reviews.length})
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

      {/* Content based on active tab */}
      {activeTab === "bookings" && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
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
              Prenotazioni Ricevute
            </h2>
          </div>
          <BookingList
            bookings={bookings}
            onComplete={(booking) => {
              setSelectedBooking(booking);
              setShowCompleteModal(true);
            }}
            onCancel={handleCancelBooking}
            onChat={(booking) => {
              navigate(`/messages?bookingId=${booking.id}`);
            }}
          />
        </div>
      )}

      {activeTab === "services" && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              I Miei Servizi
            </h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setServiceModalMode("create");
                setEditingService(null);
                setShowServiceModal(true);
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Aggiungi
            </button>
          </div>
          <ServiceList
            services={services}
            onEdit={(service) => {
              setEditingService(service);
              setServiceModalMode("edit");
              setShowServiceModal(true);
            }}
            onCalendar={(service) => setAvailabilityService(service)}
            onDelete={handleDeleteService}
          />
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Le Mie Recensioni
            </h2>
            {stats.averageRating > 0 && (
              <div className="average-rating-badge">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="#ffc107"
                  stroke="#ffc107"
                  strokeWidth="2"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {stats.averageRating.toFixed(1)} media
              </div>
            )}
          </div>
          <ReviewList reviews={reviews} />
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
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
              Il Mio Calendario
            </h2>
          </div>
          <BookingCalendar
            events={bookings.map((booking) => ({
              id: booking.id,
              title: booking.serviceTitle,
              date: booking.date,
              time: booking.preferredTime,
              status: booking.status,
              amount: booking.amount,
              clientName: booking.clientEmail?.split("@")[0],
              address: booking.address,
            }))}
            onEventClick={(event) => {
              const booking = bookings.find((b) => b.id === event.id);
              if (booking) {
                setSelectedBooking(booking);
                setShowCompleteModal(true);
              }
            }}
            userType="provider"
          />
        </div>
      )}

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

      {/* Service Modal (Create/Edit) */}
      <ServiceModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onSubmit={
          serviceModalMode === "create"
            ? handleCreateService
            : handleUpdateService
        }
        initialData={editingService}
        mode={serviceModalMode}
        bookings={
          editingService
            ? bookings
                .filter(
                  (b) =>
                    b.serviceId === editingService.id &&
                    b.status !== "cancelled"
                )
                .map((b) => new Date(b.date).toISOString().split("T")[0])
            : []
        }
      />

      {/* Availability Modal */}
      <AvailabilityModal
        isOpen={!!availabilityService}
        onClose={() => setAvailabilityService(null)}
        service={availabilityService}
        bookings={
          availabilityService
            ? bookings
                .filter(
                  (b) =>
                    b.serviceId === availabilityService.id &&
                    b.status !== "cancelled"
                )
                .map((b) => new Date(b.date).toISOString().split("T")[0])
            : []
        }
        onSave={handleUpdateAvailability}
      />

      {/* Complete Booking Modal */}
      <CompleteBookingModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={handleCompleteBooking}
      />
    </div>
  );
};

export default ProviderDashboard;
