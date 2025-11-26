import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { path: "/", icon: "📊", label: "Dashboard", end: true },
    { path: "/users", icon: "👥", label: "Utenti" },
    { path: "/services", icon: "🛠️", label: "Servizi" },
    { path: "/bookings", icon: "📅", label: "Prenotazioni" },
    { path: "/settings", icon: "⚙️", label: "Impostazioni" },
  ];

  return (
    <div className={`admin-layout ${sidebarCollapsed ? "collapsed" : ""}`}>
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            {sidebarCollapsed ? "🏠" : "🏠 Domy Admin"}
          </div>
          <button
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Espandi" : "Comprimi"}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="nav-label">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-icon">👤</span>
            {!sidebarCollapsed && (
              <span className="user-email">{user?.email}</span>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span>
            {!sidebarCollapsed && <span>Esci</span>}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
