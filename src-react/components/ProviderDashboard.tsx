import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import ToastNotification, { Notification } from "./ToastNotification";
import ServiceList from "./provider/ServiceList";
import BookingList from "./provider/BookingList";
import ReviewList from "./provider/ReviewList";
import ServiceModal from "./provider/ServiceModal";
import CompleteBookingModal from "./provider/CompleteBookingModal";
import AvailabilityModal from "./provider/AvailabilityModal";
import { Service, Booking, Review } from "../types/provider";
import { ProviderAvailability } from "./AvailabilityManager";
import { authService } from "../services/authService";
import { servicesService } from "../services/servicesService";
import { bookingService } from "../services/bookingService";
import { reviewService } from "../services/reviewService";
import "../styles/ProviderDashboard.css";
import "../styles/ToastNotification.css";

const ProviderDashboard: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

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
  }, []);

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
      setUserEmail(user.email);
      setUserId(user.id);
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

  const handleCompleteBooking = async (photo: File) => {
    if (!selectedBooking) return;

    try {
      await bookingService.completeBooking(selectedBooking.id, photo);
      alert(
        "Servizio completato! Il pagamento è stato rilasciato dall'escrow."
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
        <h1>🛠️ Dashboard Fornitore</h1>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => navigate("/client-dashboard")}
            style={{ marginRight: "10px" }}
          >
            👤 Dashboard Cliente
          </button>
          <button
            className="btn-add-service"
            onClick={() => {
              setServiceModalMode("create");
              setEditingService(null);
              setShowServiceModal(true);
            }}
          >
            + Nuovo Servizio
          </button>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>📦 I Miei Servizi</h2>
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

      <div className="dashboard-section">
        <h2>📅 Prenotazioni Ricevute</h2>
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

      <div className="dashboard-section">
        <h2>⭐ Le Mie Recensioni</h2>
        <ReviewList reviews={reviews} />
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
