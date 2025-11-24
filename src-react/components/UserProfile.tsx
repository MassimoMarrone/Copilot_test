import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";
import "../styles/UserProfile.css";

interface User {
  id: string;
  email: string;
  userType: "client" | "provider";
  isProvider?: boolean;
  isClient?: boolean;
  createdAt?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await fetch("/api/me");
      if (!response.ok) {
        navigate("/");
        return;
      }
      const userData = await response.json();
      setUser(userData);
      setDisplayName(userData.displayName || "");
      setBio(userData.bio || "");
      setLoading(false);
    } catch (error) {
      console.error("Error loading user data:", error);
      navigate("/");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("displayName", displayName);
    formData.append("bio", bio);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const response = await fetch("/api/me/profile", {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setEditing(false);
        alert("Profilo aggiornato con successo!");
      } else {
        const data = await response.json();
        alert(data.error || "Errore durante l'aggiornamento del profilo");
      }
    } catch (error) {
      console.error("Update profile error:", error);
      alert("Errore di connessione");
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile e cancellerà tutti i tuoi dati e le prenotazioni pendenti."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/me", { method: "DELETE" });
      if (response.ok) {
        alert("Account eliminato con successo.");
        navigate("/");
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || "Errore durante l'eliminazione dell'account");
      }
    } catch (error) {
      console.error("Delete account error:", error);
      alert("Errore di connessione");
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Caricamento...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="container">
          <h1>🏠 Servizi di Pulizia</h1>
          <UserMenu
            userEmail={user.email}
            userType={user.userType}
            isProvider={user.isProvider}
          />
        </div>
      </div>

      <div className="profile-container">
        <div className="container">
          <div className="profile-card">
            <div className="profile-avatar-section">
              <div
                className="profile-avatar-large"
                style={{
                  backgroundImage:
                    previewUrl || user.avatarUrl
                      ? `url(${previewUrl || user.avatarUrl})`
                      : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!(previewUrl || user.avatarUrl) && "👤"}
              </div>
              {editing && (
                <div className="avatar-upload">
                  <button
                    type="button"
                    className="btn-upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Cambia Foto
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    accept="image/*"
                  />
                </div>
              )}
              <h2>{user.displayName || "Utente"}</h2>
              {user.isProvider && (
                <a
                  href={`/provider/${user.id}`}
                  className="view-public-profile"
                >
                  Vedi Profilo Pubblico
                </a>
              )}
            </div>

            {editing ? (
              <form
                onSubmit={handleUpdateProfile}
                className="profile-edit-form"
              >
                <div className="form-group">
                  <label>Nome Visualizzato</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Il tuo nome pubblico"
                    maxLength={50}
                  />
                </div>

                <div className="form-group">
                  <label>Biografia</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Racconta qualcosa di te..."
                    maxLength={500}
                    rows={4}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Salva Modifiche
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditing(false);
                      setDisplayName(user.displayName || "");
                      setBio(user.bio || "");
                      setPreviewUrl(null);
                      setAvatarFile(null);
                    }}
                  >
                    Annulla
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info-section">
                <div className="profile-info-row">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{user.email}</span>
                </div>

                <div className="profile-info-row">
                  <span className="info-label">Nome:</span>
                  <span className="info-value">{user.displayName || "-"}</span>
                </div>

                <div className="profile-info-row">
                  <span className="info-label">Bio:</span>
                  <span className="info-value bio-text">{user.bio || "-"}</span>
                </div>

                <div className="profile-info-row">
                  <span className="info-label">Tipo Account:</span>
                  <span className="info-value">
                    {user.userType === "provider" ? "Fornitore" : "Cliente"}
                  </span>
                </div>

                {user.createdAt && (
                  <div className="profile-info-row">
                    <span className="info-label">Membro dal:</span>
                    <span className="info-value">
                      {new Date(user.createdAt).toLocaleDateString("it-IT", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}

                <div className="profile-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setEditing(true)}
                  >
                    Modifica Profilo
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      navigate(
                        user.userType === "provider"
                          ? "/provider-dashboard"
                          : "/client-dashboard"
                      )
                    }
                  >
                    Torna alla Dashboard
                  </button>
                </div>
              </div>
            )}

            <div
              className="profile-danger-zone"
              style={{
                marginTop: "30px",
                borderTop: "1px solid #eee",
                paddingTop: "20px",
              }}
            >
              <h3
                style={{
                  color: "#dc3545",
                  fontSize: "1.1rem",
                  marginBottom: "10px",
                }}
              >
                Zona Pericolo
              </h3>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#666",
                  marginBottom: "15px",
                }}
              >
                Una volta eliminato l'account, non è possibile tornare indietro.
                Per favore, sii certo.
              </p>
              <button
                className="btn"
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                }}
                onClick={handleDeleteAccount}
              >
                Elimina Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
