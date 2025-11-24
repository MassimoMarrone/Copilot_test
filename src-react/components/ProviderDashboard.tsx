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

  const loadReviews = async () => {
    try {
      const response = await fetch("/api/my-reviews");
      const data = await response.json();
      setReviews(data);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const handleCreateService = async (formData: FormData) => {
    try {
      const response = await fetch("/api/services", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Servizio creato con successo!");
        setShowServiceModal(false);
        loadServices();
      } else {
        const data = await response.json();
        alert(data.error || "Errore nella creazione del servizio");
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  };

  const handleUpdateService = async (formData: FormData) => {
    if (!editingService) return;

    try {
      const response = await fetch(`/api/services/${editingService.id}`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        alert("Servizio aggiornato con successo!");
        setShowServiceModal(false);
        setEditingService(null);
        loadServices();
      } else {
        const data = await response.json();
        alert(data.error || "Errore nell'aggiornamento del servizio");
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  };

  const handleUpdateAvailability = async (
    availability: ProviderAvailability
  ) => {
    if (!availabilityService) return;

    const formData = new FormData();
    formData.append("availability", JSON.stringify(availability));

    try {
      const response = await fetch(`/api/services/${availabilityService.id}`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        alert("Disponibilità aggiornata con successo!");
        setAvailabilityService(null);
        loadServices();
      } else {
        const data = await response.json();
        alert(data.error || "Errore nell'aggiornamento della disponibilità");
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  };

  const handleCompleteBooking = async (photo: File) => {
    if (!selectedBooking) return;

    const formData = new FormData();
    formData.append("photo", photo);

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

  const handleCancelBooking = async (booking: Booking) => {
    if (
      !window.confirm(
        "Sei sicuro di voler cancellare questa prenotazione? Se il pagamento è stato effettuato, verrà rimborsato."
      )
    )
      return;

    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
      });
      if (response.ok) {
        alert("Prenotazione cancellata con successo");
        loadBookings();
      } else {
        const data = await response.json();
        alert(
          data.error || "Errore durante la cancellazione della prenotazione"
        );
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  };

  return (
    <div className="provider-dashboard">
      <div className="dashboard-header">
        <h1>🛠️ Dashboard Fornitore</h1>
        <div className="header-actions">
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
