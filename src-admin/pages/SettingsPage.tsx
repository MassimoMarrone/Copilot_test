import React from "react";

const SettingsPage: React.FC = () => {
  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>⚙️ Impostazioni</h1>
        <p>Configura le impostazioni della piattaforma</p>
      </div>

      <div className="settings-sections">
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
