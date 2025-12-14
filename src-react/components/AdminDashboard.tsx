import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";
import ServiceMap from "./ServiceMap";
import { adminService, AdminUser, AdminStats } from "../services/adminService";
import { useAuth } from "../context/AuthContext";
import { Service, Booking } from "../types";
import "../styles/AdminDashboard.css";

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const { user: currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "services" | "bookings"
  >("overview");
  const [serviceViewMode, setServiceViewMode] = useState<"list" | "map">(
    "list"
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || currentUser.userType !== "admin") {
      navigate("/");
      return;
    }
    loadData();
  }, [currentUser, navigate]);

  const loadData = async () => {
    try {
      const [usersData, servicesData, bookingsData, statsData] =
        await Promise.all([
          adminService.getUsers(),
          adminService.getServices(),
          adminService.getBookings(),
          adminService.getStats(),
        ]);

      setUsers(usersData);
      setServices(servicesData);
      setBookings(bookingsData);
      setStats(statsData);
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
      await adminService.toggleUserBlock(id, isBlocked);
      setUsers(
        users.map((u) => (u.id === id ? { ...u, isBlocked: !isBlocked } : u))
      );
      // Reload bookings as some might have been cancelled
      const bookingsData = await adminService.getBookings();
      setBookings(bookingsData);
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
      await adminService.deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
      loadData(); // Reload stats
    } catch (error) {
      alert("Error deleting user");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this service?"))
      return;

    try {
      await adminService.deleteService(id);
      setServices(services.filter((s) => s.id !== id));
      loadData(); // Reload stats
    } catch (error) {
      alert("Error deleting service");
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🛡️ Admin Dashboard</h1>
        <div className="header-actions">
          <UserMenu
            userEmail={currentUser?.email}
            userType="admin"
            onLogout={() => {
              logout();
              navigate("/");
            }}
          />
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          👥 Users
        </button>
        <button
          className={`tab-btn ${activeTab === "services" ? "active" : ""}`}
          onClick={() => setActiveTab("services")}
        >
          🛠️ Services
        </button>
        <button
          className={`tab-btn ${activeTab === "bookings" ? "active" : ""}`}
          onClick={() => setActiveTab("bookings")}
        >
          📅 Bookings
        </button>
      </div>

      {activeTab === "overview" && stats && (
        <div className="dashboard-section">
          <h2>📊 Platform Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalServices}</div>
              <div className="stat-label">Active Services</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalBookings}</div>
              <div className="stat-label">Total Bookings</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">€{stats.totalRevenue}</div>
              <div className="stat-label">Total Volume</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="dashboard-section">
          <h2>👥 Users Management</h2>
          <div className="admin-list">
            {users.map((user) => (
              <div key={user.id} className="admin-card">
                <div className="card-info">
                  <h3>
                    {user.email}
                    {user.isBlocked && (
                      <span className="status-badge status-blocked">
                        BLOCKED
                      </span>
                    )}
                  </h3>
                  <p>
                    Role: <strong>{user.userType}</strong>
                  </p>
                  <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                {user.userType !== "admin" && (
                  <div className="card-actions">
                    <button
                      onClick={() =>
                        handleBlockUser(user.id, user.isBlocked || false)
                      }
                      className={`btn btn-sm ${
                        user.isBlocked ? "btn-success" : "btn-warning"
                      }`}
                    >
                      {user.isBlocked ? "Unblock" : "Block"}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Delete
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
          <div className="view-mode-toggle">
            <button
              onClick={() => setServiceViewMode("list")}
              className={`btn ${serviceViewMode === "list" ? "active" : ""}`}
            >
              List View
            </button>
            <button
              onClick={() => setServiceViewMode("map")}
              className={`btn ${serviceViewMode === "map" ? "active" : ""}`}
            >
              Map View
            </button>
          </div>
          {serviceViewMode === "list" ? (
            <div className="admin-list">
              {services.map((service) => (
                <div key={service.id} className="admin-card">
                  <div className="card-info">
                    <h3>{service.title}</h3>
                    <p>Provider: {service.providerEmail}</p>
                    <p>Category: {service.category || "N/A"}</p>
                    <p>Price: €{service.price}</p>
                    {service.address && <p>📍 {service.address}</p>}
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Delete Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ServiceMap services={services} />
          )}
        </div>
      )}

      {activeTab === "bookings" && (
        <div className="dashboard-section">
          <h2>📅 Bookings Management</h2>
          <div className="admin-list">
            {bookings.map((booking) => (
              <div key={booking.id} className="admin-card">
                <div className="card-info">
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
                    <strong>Payment:</strong> {booking.paymentStatus}
                  </p>
                  <p>
                    <strong>Amount:</strong> €{booking.amount}
                  </p>
                </div>
                <div className="card-actions">
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
                            await adminService.cancelBooking(booking.id);
                            // Refresh bookings list
                            const bookingsData =
                              await adminService.getBookings();
                            setBookings(bookingsData);
                            loadData(); // Reload stats
                          } catch (error) {
                            alert("Error cancelling booking");
                          }
                        }}
                        className="btn btn-sm btn-warning"
                      >
                        Cancel
                      </button>
                    )}
                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "Are you sure you want to delete this booking permanently? This action cannot be undone."
                        )
                      )
                        return;
                      try {
                        await adminService.deleteBooking(booking.id);
                        setBookings(
                          bookings.filter((b) => b.id !== booking.id)
                        );
                        loadData(); // Reload stats
                      } catch (error) {
                        alert("Error deleting booking");
                      }
                    }}
                    className="btn btn-sm btn-danger"
                  >
                    Delete
                  </button>
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
