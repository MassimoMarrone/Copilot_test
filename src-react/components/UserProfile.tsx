import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";
import "../styles/UserProfile.css";
import { authService, User } from "../services/authService";

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
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
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setDisplayName(userData.displayName || "");
      setFirstName(userData.firstName || "");
      setLastName(userData.lastName || "");
      setPhone(userData.phone || "");
      setAddress(userData.address || "");
      setCity(userData.city || "");
      setPostalCode(userData.postalCode || "");
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
    setSaving(true);

    const formData = new FormData();
    formData.append("displayName", displayName);
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);
    formData.append("phone", phone);
    formData.append("address", address);
    formData.append("city", city);
    formData.append("postalCode", postalCode);
    formData.append("bio", bio);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const data = await authService.updateProfile(formData);
      setUser(data.user);
      setEditing(false);
      alert("Profilo aggiornato con successo!");
    } catch (error) {
      console.error("Update profile error:", error);
      alert("Errore durante l'aggiornamento del profilo");
    } finally {
      setSaving(false);
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
      await authService.deleteAccount();
      alert("Account eliminato con successo.");
      navigate("/");
      window.location.reload();
    } catch (error) {
      console.error("Delete account error:", error);
      alert("Errore durante l'eliminazione dell'account");
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
                <div className="form-section">
                  <h3 className="form-section-title">Informazioni Personali</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Mario"
                      />
                    </div>
                    <div className="form-group">
                      <label>Cognome</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Rossi"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Nome Visualizzato</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Come vuoi essere chiamato"
                      maxLength={50}
                    />
                  </div>

                  <div className="form-group">
                    <label>Telefono</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+39 333 1234567"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section-title">Indirizzo</h3>
                  <div className="form-group">
                    <label>Via e Numero Civico</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Via Roma, 123"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Città</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Milano"
                      />
                    </div>
                    <div className="form-group">
                      <label>CAP</label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="20100"
                        maxLength={5}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section-title">Bio</h3>
                  <div className="form-group">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Racconta qualcosa di te..."
                      maxLength={500}
                      rows={4}
                    />
                    <span className="char-count">{bio.length}/500</span>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Salvataggio..." : "Salva Modifiche"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditing(false);
                      setDisplayName(user.displayName || "");
                      setFirstName(user.firstName || "");
                      setLastName(user.lastName || "");
                      setPhone(user.phone || "");
                      setAddress(user.address || "");
                      setCity(user.city || "");
                      setPostalCode(user.postalCode || "");
                      setBio(user.bio || "");
                      setPreviewUrl(null);
                      setAvatarFile(null);
                    }}
                    disabled={saving}
                  >
                    Annulla
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info-section">
                <div className="profile-section-group">
                  <h3 className="section-title">Informazioni Personali</h3>
                  <div className="profile-info-row">
                    <span className="info-label">Nome Utente</span>
                    <span className="info-value username-value">
                      @{user.username || "-"}
                    </span>
                  </div>
                  <div className="profile-info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">{user.email}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="info-label">Nome</span>
                    <span className="info-value">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.displayName || "-"}
                    </span>
                  </div>
                  <div className="profile-info-row">
                    <span className="info-label">Telefono</span>
                    <span className="info-value">{user.phone || "-"}</span>
                  </div>
                </div>

                <div className="profile-section-group">
                  <h3 className="section-title">Indirizzo</h3>
                  <div className="profile-info-row">
                    <span className="info-label">Via</span>
                    <span className="info-value">{user.address || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="info-label">Città</span>
                    <span className="info-value">
                      {user.city
                        ? `${user.city}${
                            user.postalCode ? ` (${user.postalCode})` : ""
                          }`
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="profile-section-group">
                  <h3 className="section-title">Account</h3>
                  <div className="profile-info-row">
                    <span className="info-label">Tipo Account</span>
                    <span className="info-value account-badges">
                      {user.isClient && (
                        <span className="badge badge-client">Cliente</span>
                      )}
                      {user.isProvider && (
                        <span className="badge badge-provider">Fornitore</span>
                      )}
                    </span>
                  </div>
                  {user.createdAt && (
                    <div className="profile-info-row">
                      <span className="info-label">Membro dal</span>
                      <span className="info-value">
                        {new Date(user.createdAt).toLocaleDateString("it-IT", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {user.bio && (
                  <div className="profile-section-group">
                    <h3 className="section-title">Bio</h3>
                    <p className="bio-content">{user.bio}</p>
                  </div>
                )}

                <div className="profile-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setEditing(true)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Modifica Profilo
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      navigate(
                        user.isProvider
                          ? "/provider-dashboard"
                          : "/client-dashboard"
                      )
                    }
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
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
