import React, { useState, useEffect } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { adminApi, AdminUser } from "../services/adminApi";

const SettingsPage: React.FC = () => {
  const { isSuperAdmin, user: currentUser } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState("");

  useEffect(() => {
    if (isSuperAdmin) {
      loadAdmins();
      loadUsers();
    }
  }, [isSuperAdmin]);

  const loadAdmins = async () => {
    try {
      const data = await adminApi.getAdmins();
      setAdmins(data);
    } catch (error) {
      console.error("Error loading admins:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data.filter((u) => !u.isAdmin));
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handlePromote = async () => {
    const userToPromote = users.find(
      (u) => u.email.toLowerCase() === promoteEmail.toLowerCase()
    );
    if (!userToPromote) {
      alert("Utente non trovato");
      return;
    }

    if (!window.confirm(`Vuoi promuovere ${userToPromote.email} ad admin?`)) {
      return;
    }

    setLoading(true);
    try {
      await adminApi.promoteToAdmin(userToPromote.id);
      setPromoteEmail("");
      loadAdmins();
      loadUsers();
    } catch (error) {
      alert("Errore durante la promozione");
    } finally {
      setLoading(false);
    }
  };

  const handleDemote = async (admin: AdminUser) => {
    if (admin.adminLevel === "super") {
      alert("Non puoi rimuovere un Super Admin");
      return;
    }

    if (!window.confirm(`Vuoi rimuovere ${admin.email} dagli admin?`)) {
      return;
    }

    setLoading(true);
    try {
      await adminApi.demoteAdmin(admin.id);
      loadAdmins();
      loadUsers();
    } catch (error) {
      alert("Errore durante la rimozione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>⚙️ Impostazioni</h1>
        <p>Configura le impostazioni della piattaforma</p>
      </div>

      <div className="settings-sections">
        {/* Admin Management - Solo per Super Admin */}
        {isSuperAdmin && (
          <div className="settings-section admin-management">
            <h2>👑 Gestione Amministratori</h2>
            <p className="section-description">
              Solo i Super Admin possono gestire altri amministratori
            </p>

            <div className="admin-list">
              <h3>Amministratori attuali</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Nome</th>
                    <th>Livello</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td>{admin.email}</td>
                      <td>{admin.displayName || admin.firstName || "-"}</td>
                      <td>
                        <span
                          className={`admin-level ${admin.adminLevel || "standard"}`}
                        >
                          {admin.adminLevel === "super"
                            ? "👑 Super Admin"
                            : "🛡️ Admin"}
                        </span>
                      </td>
                      <td>
                        {admin.adminLevel !== "super" &&
                          admin.id !== currentUser?.id && (
                            <button
                              className="demote-btn"
                              onClick={() => handleDemote(admin)}
                              disabled={loading}
                            >
                              Rimuovi
                            </button>
                          )}
                        {admin.adminLevel === "super" && (
                          <span className="protected">Protetto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="promote-section">
              <h3>Promuovi utente ad Admin</h3>
              <div className="promote-form">
                <input
                  type="email"
                  placeholder="Email dell'utente da promuovere"
                  value={promoteEmail}
                  onChange={(e) => setPromoteEmail(e.target.value)}
                  list="users-list"
                />
                <datalist id="users-list">
                  {users.map((u) => (
                    <option key={u.id} value={u.email} />
                  ))}
                </datalist>
                <button
                  className="promote-btn"
                  onClick={handlePromote}
                  disabled={loading || !promoteEmail}
                >
                  {loading ? "..." : "Promuovi"}
                </button>
              </div>
              <small>
                L'utente diventerà Admin standard e potrà gestire utenti,
                servizi e prenotazioni.
              </small>
            </div>
          </div>
        )}

        <div className="settings-section">
          <h2>🏢 Informazioni Piattaforma</h2>
          <div className="settings-form">
            <div className="form-group">
              <label>Nome Piattaforma</label>
              <input type="text" defaultValue="Domy" disabled />
            </div>
            <div className="form-group">
              <label>Email Supporto</label>
              <input type="email" defaultValue="support@domy.it" disabled />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>💳 Commissioni</h2>
          <div className="settings-form">
            <div className="form-group">
              <label>Commissione Piattaforma (%)</label>
              <input type="number" defaultValue="10" disabled />
              <small>Percentuale trattenuta su ogni prenotazione</small>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>📧 Notifiche</h2>
          <div className="settings-form">
            <div className="form-group checkbox">
              <label>
                <input type="checkbox" defaultChecked disabled />
                Notifica nuove registrazioni
              </label>
            </div>
            <div className="form-group checkbox">
              <label>
                <input type="checkbox" defaultChecked disabled />
                Notifica nuovi servizi
              </label>
            </div>
            <div className="form-group checkbox">
              <label>
                <input type="checkbox" defaultChecked disabled />
                Report giornaliero
              </label>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>🔒 Sicurezza</h2>
          <div className="settings-form">
            <div className="form-group">
              <label>Tentativi login massimi</label>
              <input type="number" defaultValue="5" disabled />
            </div>
            <div className="form-group">
              <label>Timeout sessione (minuti)</label>
              <input type="number" defaultValue="60" disabled />
            </div>
          </div>
        </div>

        <div className="settings-info">
          <p>
            ℹ️ Le impostazioni sono attualmente in sola lettura. Contatta lo
            sviluppatore per modificarle.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
