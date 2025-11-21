import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";
import "../styles/ClientDashboard.css"; // Reuse existing styles for now

interface User {
  id: string;
  email: string;
  userType: string;
  createdAt: string;
  isBlocked?: boolean;
}

interface Service {
  id: string;
  title: string;
  providerEmail: string;
  price: number;
}

interface Booking {
  id: string;
  serviceTitle: string;
  clientEmail: string;
  providerEmail: string;
  date: string;
  status: string;
  amount: number;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"users" | "services" | "bookings">(
    "users"
  );
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/me");
      if (!response.ok) {
        navigate("/");
        return;
      }
      const user = await response.json();
      if (user.userType !== "admin") {
        navigate("/");
        return;
      }
      setCurrentUser(user);
    } catch (error) {
      navigate("/");
    }
  };

  const loadData = async () => {
    try {
      const [usersRes, servicesRes, bookingsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/services"),
        fetch("/api/admin/bookings"),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
    } catch (error) {
      console.error("Error loading admin data:", error);
    }
  };

  const handleBlockUser = async (id: string, isBlocked: boolean) => {
    const action = isBlocked ? "unblock" : "block";
    if (
      !window.confirm(
        `Are you sure you want to ${action} this user? ${
          !isBlocked
            ? "This will hide their services and cancel pending bookings."
            : ""
        }`
      )
    )
      return;

    try {
      const response = await fetch(`/api/admin/users/${id}/${action}`, {
        method: "POST",
      });
      if (response.ok) {
        setUsers(
          users.map((u) => (u.id === id ? { ...u, isBlocked: !isBlocked } : u))
        );
        // Reload bookings as some might have been cancelled
        const bookingsRes = await fetch("/api/admin/bookings");
        if (bookingsRes.ok) setBookings(await bookingsRes.json());
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${action} user`);
      }
    } catch (error) {
      alert(`Error ${action}ing user`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    )
      return;

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setUsers(users.filter((u) => u.id !== id));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      alert("Error deleting user");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this service?"))
      return;

    try {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setServices(services.filter((s) => s.id !== id));
      } else {
        alert("Failed to delete service");
      }
    } catch (error) {
      alert("Error deleting service");
    }
  };

  return (
    <div className="client-dashboard">
      <div className="dashboard-header">
        <h1>🛡️ Admin Dashboard</h1>
        <div className="header-actions">
          <UserMenu
            userEmail={currentUser?.email}
            userType="admin"
            onLogout={() => {
              fetch("/api/logout", { method: "POST" }).then(() => {
                navigate("/");
                window.location.reload();
              });
            }}
          />
        </div>
      </div>

      <div
        className="dashboard-tabs"
        style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}
      >
        <button
          className={`btn ${
            activeTab === "users" ? "btn-primary" : "btn-secondary"
          }`}
          onClick={() => setActiveTab("users")}
          style={{
            backgroundColor: activeTab === "users" ? "#007bff" : "#6c757d",
            color: "white",
          }}
        >
          👥 Users
        </button>
        <button
          className={`btn ${
            activeTab === "services" ? "btn-primary" : "btn-secondary"
          }`}
          onClick={() => setActiveTab("services")}
          style={{
            backgroundColor: activeTab === "services" ? "#007bff" : "#6c757d",
            color: "white",
          }}
        >
          🛠️ Services
        </button>
        <button
          className={`btn ${
            activeTab === "bookings" ? "btn-primary" : "btn-secondary"
          }`}
          onClick={() => setActiveTab("bookings")}
          style={{
            backgroundColor: activeTab === "bookings" ? "#007bff" : "#6c757d",
            color: "white",
          }}
        >
          📅 Bookings
        </button>
      </div>

      {activeTab === "users" && (
        <div className="dashboard-section">
          <h2>👥 Users Management</h2>
          <div className="bookings-list">
            {users.map((user) => (
              <div
                key={user.id}
                className="booking-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3>{user.email}</h3>
                  <p>
                    Role: <strong>{user.userType}</strong>
                  </p>
                  <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                {user.userType !== "admin" && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() =>
                        handleBlockUser(user.id, user.isBlocked || false)
                      }
                      className="btn"
                      style={{
                        backgroundColor: user.isBlocked ? "#28a745" : "#ffc107",
                        color: "white",
                      }}
                    >
                      {user.isBlocked ? "Unblock" : "Block"}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="btn btn-secondary"
                      style={{ backgroundColor: "#dc3545", color: "white" }}
                    >
                      Delete User
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "services" && (
        <div className="dashboard-section">
          <h2>🛠️ Services Management</h2>
          <div className="bookings-list">
            {services.map((service) => (
              <div
                key={service.id}
                className="booking-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3>{service.title}</h3>
                  <p>Provider: {service.providerEmail}</p>
                  <p>Price: €{service.price}</p>
                </div>
                <button
                  onClick={() => handleDeleteService(service.id)}
                  className="btn btn-secondary"
                  style={{ backgroundColor: "#dc3545", color: "white" }}
                >
                  Delete Service
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "bookings" && (
        <div className="dashboard-section">
          <h2>📅 Bookings Management</h2>
          <div className="bookings-list">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="booking-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3>{booking.serviceTitle}</h3>
                  <p>
                    <strong>Client:</strong> {booking.clientEmail}
                  </p>
                  <p>
                    <strong>Provider:</strong> {booking.providerEmail}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(booking.date).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Status:</strong> {booking.status}
                  </p>
                  <p>
                    <strong>Amount:</strong> €{booking.amount}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {booking.status !== "cancelled" &&
                    booking.status !== "completed" && (
                      <button
                        onClick={async () => {
                          if (
                            !window.confirm(
                              "Are you sure you want to cancel this booking? If paid, it will be refunded."
                            )
                          )
                            return;
                          try {
                            const response = await fetch(
                              `/api/admin/bookings/${booking.id}/cancel`,
                              {
                                method: "POST",
                              }
                            );
                            if (response.ok) {
                              // Refresh bookings list
                              const bookingsRes = await fetch(
                                "/api/admin/bookings"
                              );
                              if (bookingsRes.ok)
                                setBookings(await bookingsRes.json());
                            } else {
                              alert("Failed to cancel booking");
                            }
                          } catch (error) {
                            alert("Error cancelling booking");
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ backgroundColor: "#ffc107", color: "black" }}
                      >
                        Cancel
                      </button>
                    )}
                </div>
              </div>
            ))}
            {bookings.length === 0 && <p>No bookings found.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
