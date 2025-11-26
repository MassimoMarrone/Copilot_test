import React, { useState, useEffect } from "react";
import { adminApi, AdminUser } from "../services/adminApi";

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "clients" | "providers" | "blocked"
  >("all");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (user: AdminUser) => {
    const action = user.isBlocked ? "sbloccare" : "bloccare";
    if (!window.confirm(`Vuoi ${action} l'utente ${user.email}?`)) return;

    try {
      await adminApi.toggleUserBlock(user.id, user.isBlocked);
      setUsers(
        users.map((u) =>
          u.id === user.id ? { ...u, isBlocked: !u.isBlocked } : u
        )
      );
    } catch (error) {
      alert("Errore durante l'operazione");
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (
      !window.confirm(
        `Sei sicuro di voler eliminare ${user.email}? Questa azione non può essere annullata.`
      )
    )
      return;

    try {
      await adminApi.deleteUser(user.id);
      setUsers(users.filter((u) => u.id !== user.id));
    } catch (error) {
      alert("Errore durante l'eliminazione");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.firstName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (user.lastName?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "clients" && user.isClient) ||
      (filter === "providers" && user.isProvider) ||
      (filter === "blocked" && user.isBlocked);

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Caricamento utenti...</p>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>👥 Gestione Utenti</h1>
        <p>{users.length} utenti registrati</p>
      </div>

      <div className="page-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Cerca per email o nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-tabs">
          {[
            { key: "all", label: "Tutti" },
            { key: "clients", label: "Clienti" },
            { key: "providers", label: "Provider" },
            { key: "blocked", label: "Bloccati" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab ${filter === tab.key ? "active" : ""}`}
              onClick={() => setFilter(tab.key as typeof filter)}
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
              <th>Utente</th>
              <th>Tipo</th>
              <th>Servizi</th>
              <th>Prenotazioni</th>
              <th>Registrato</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={user.isBlocked ? "blocked" : ""}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">
                      {user.firstName?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <div className="user-info">
                      <strong>
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.email}
                      </strong>
                      <small>{user.email}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="type-badges">
                    {user.isClient && (
                      <span className="badge client">Cliente</span>
                    )}
                    {user.isProvider && (
                      <span className="badge provider">Provider</span>
                    )}
                    {user.userType === "admin" && (
                      <span className="badge admin">Admin</span>
                    )}
                  </div>
                </td>
                <td>{user.servicesCount || 0}</td>
                <td>{user.bookingsCount || 0}</td>
                <td>{new Date(user.createdAt).toLocaleDateString("it-IT")}</td>
                <td>
                  {user.isBlocked ? (
                    <span className="status-badge blocked">🚫 Bloccato</span>
                  ) : (
                    <span className="status-badge active">✅ Attivo</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className={`action-btn ${
                        user.isBlocked ? "unblock" : "block"
                      }`}
                      onClick={() => handleBlock(user)}
                      disabled={user.userType === "admin"}
                      title={user.isBlocked ? "Sblocca" : "Blocca"}
                    >
                      {user.isBlocked ? "🔓" : "🔒"}
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(user)}
                      disabled={user.userType === "admin"}
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="no-results">
            <p>Nessun utente trovato</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
