import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserMenu from './UserMenu';
import '../styles/UserProfile.css';

interface User {
  email: string;
  userType: 'client' | 'provider';
  isProvider?: boolean;
  isClient?: boolean;
  createdAt?: string;
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/me');
      if (!response.ok) {
        navigate('/');
        return;
      }
      const userData = await response.json();
      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      navigate('/');
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
              <div className="profile-avatar-large">👤</div>
              <h2>Profilo Utente</h2>
            </div>

            <div className="profile-info-section">
              <div className="profile-info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{user.email}</span>
              </div>

              <div className="profile-info-row">
                <span className="info-label">Tipo Account:</span>
                <span className="info-value">
                  {user.userType === 'provider' ? 'Fornitore' : 'Cliente'}
                </span>
              </div>

              {user.isProvider && user.userType === 'client' && (
                <div className="profile-info-row">
                  <span className="info-label">Account Aggiuntivo:</span>
                  <span className="info-value">Anche Fornitore</span>
                </div>
              )}

              {user.createdAt && (
                <div className="profile-info-row">
                  <span className="info-label">Membro dal:</span>
                  <span className="info-value">
                    {new Date(user.createdAt).toLocaleDateString('it-IT', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="profile-actions">
              <button 
                className="btn btn-primary"
                onClick={() => navigate(user.userType === 'provider' ? '/provider-dashboard' : '/client-dashboard')}
              >
                Torna alla Dashboard
              </button>
            </div>

            <div className="profile-danger-zone" style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <h3 style={{ color: '#dc3545', fontSize: '1.1rem', marginBottom: '10px' }}>Zona Pericolo</h3>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                Una volta eliminato l'account, non è possibile tornare indietro. Per favore, sii certo.
              </p>
              <button 
                className="btn"
                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
                onClick={handleDeleteAccount}
              >
                Elimina Account
              </button>
            </div>
          </div>

          <div className="profile-additional-info">
            <h3>Informazioni Account</h3>
            <p>
              Questo profilo mostra le informazioni di base del tuo account.
              Per modificare le tue preferenze o aggiornare i tuoi dati,
              contatta il supporto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
