import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../services/adminApi";

interface Stats {
  totalUsers: number;
  totalServices: number;
  totalBookings: number;
  totalRevenue: number;
  newUsersToday: number;
  pendingBookings: number;
  activeProviders: number;
  completedBookings: number;
}

interface RecentActivity {
  id: string;
  type: "booking" | "user" | "service";
  message: string;
  timestamp: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, activityData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getRecentActivity(),
      ]);
      setStats(statsData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Caricamento dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Utenti Totali",
      value: stats?.totalUsers || 0,
      icon: "👥",
      color: "#3498db",
      link: "/users",
    },
    {
      label: "Servizi Attivi",
      value: stats?.totalServices || 0,
      icon: "🛠️",
      color: "#2ecc71",
      link: "/services",
    },
    {
      label: "Prenotazioni",
      value: stats?.totalBookings || 0,
      icon: "📅",
      color: "#9b59b6",
      link: "/bookings",
    },
    {
      label: "Volume Totale",
      value: `€${stats?.totalRevenue || 0}`,
      icon: "💰",
      color: "#f39c12",
    },
  ];

  const secondaryStats = [
    { label: "Nuovi oggi", value: stats?.newUsersToday || 0, icon: "📈" },
    { label: "In attesa", value: stats?.pendingBookings || 0, icon: "⏳" },
    {
      label: "Provider attivi",
      value: stats?.activeProviders || 0,
      icon: "✅",
    },
    { label: "Completate", value: stats?.completedBookings || 0, icon: "🎉" },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>📊 Dashboard</h1>
        <p>Panoramica della piattaforma Domy</p>
      </div>

      <div className="stats-grid primary">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="stat-card clickable"
            style={{ borderLeftColor: stat.color }}
            onClick={() => stat.link && navigate(stat.link)}
          >
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="stats-grid secondary">
        {secondaryStats.map((stat, index) => (
          <div key={index} className="stat-card small">
            <span className="stat-icon">{stat.icon}</span>
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-sections">
        <div className="section recent-activity">
          <h2>🕐 Attività Recente</h2>
          <div className="activity-list">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className={`activity-item ${activity.type}`}
                >
                  <span className="activity-icon">
                    {activity.type === "booking"
                      ? "📅"
                      : activity.type === "user"
                      ? "👤"
                      : "🛠️"}
                  </span>
                  <div className="activity-content">
                    <p>{activity.message}</p>
                    <small>
                      {new Date(activity.timestamp).toLocaleString("it-IT")}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">Nessuna attività recente</p>
            )}
          </div>
        </div>

        <div className="section quick-actions">
          <h2>⚡ Azioni Rapide</h2>
          <div className="actions-grid">
            <button className="action-btn" onClick={() => navigate("/users")}>
              <span>👥</span>
              <span>Gestisci Utenti</span>
            </button>
            <button
              className="action-btn"
              onClick={() => navigate("/services")}
            >
              <span>🛠️</span>
              <span>Gestisci Servizi</span>
            </button>
            <button
              className="action-btn"
              onClick={() => navigate("/bookings")}
            >
              <span>📅</span>
              <span>Vedi Prenotazioni</span>
            </button>
            <button
              className="action-btn"
              onClick={() => navigate("/settings")}
            >
              <span>⚙️</span>
              <span>Impostazioni</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
