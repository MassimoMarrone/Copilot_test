import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";
import "../styles/ClientDashboard.css"; // Reuse existing styles for now

interface User {
  id: string;
  email: string;
  userType: string;
  createdAt: string;
}

interface Service {
  id: string;
  title: string;
  providerEmail: string;
  price: number;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
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
      const [usersRes, servicesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/services"),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
    } catch (error) {
      console.error("Error loading admin data:", error);
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
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="btn btn-secondary"
                  style={{ backgroundColor: "#dc3545", color: "white" }}
                >
                  Delete User
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
};

export default AdminDashboard;
