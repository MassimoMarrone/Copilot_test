import { useNavigate } from "react-router-dom";
import "../styles/LegalPages.css";

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Torna indietro
        </button>

        <h1>Cookie Policy</h1>
        <p className="last-updated">Ultimo aggiornamento: 18 Dicembre 2025</p>

        <section>
          <h2>1. Cosa sono i Cookie</h2>
          <p>
            I cookie sono piccoli file di testo che vengono memorizzati sul tuo
            dispositivo quando visiti un sito web. Servono a migliorare la tua
            esperienza di navigazione e a far funzionare correttamente il sito.
          </p>
        </section>

        <section>
          <h2>2. Cookie che Utilizziamo</h2>

          <h3>2.1 Cookie Tecnici (Necessari)</h3>
          <p>Questi cookie sono essenziali per il funzionamento del sito:</p>
          <table className="cookie-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Scopo</th>
                <th>Durata</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>token</code>
                </td>
                <td>Autenticazione utente (JWT)</td>
                <td>24 ore</td>
              </tr>
              <tr>
                <td>
                  <code>adminToken</code>
                </td>
                <td>Autenticazione admin</td>
                <td>24 ore</td>
              </tr>
            </tbody>
          </table>
          <p>
            <strong>Base giuridica:</strong> Legittimo interesse (necessari per
            il servizio)
          </p>

          <h3>2.2 Cookie di Terze Parti</h3>
          <p>
            Utilizziamo servizi di terze parti che potrebbero impostare cookie:
          </p>

          <h4>Stripe (Pagamenti)</h4>
          <ul>
            <li>Scopo: Elaborazione sicura dei pagamenti</li>
            <li>
              Privacy:{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                stripe.com/privacy
              </a>
            </li>
          </ul>

          <h4>Google (OAuth e Maps)</h4>
          <ul>
            <li>Scopo: Login con Google, mappe interattive</li>
            <li>
              Privacy:{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                policies.google.com/privacy
              </a>
            </li>
          </ul>

          <h4>Sentry (Monitoraggio errori)</h4>
          <ul>
            <li>Scopo: Rilevamento e correzione errori tecnici</li>
            <li>
              Privacy:{" "}
              <a
                href="https://sentry.io/privacy/"
                target="_blank"
                rel="noopener noreferrer"
              >
                sentry.io/privacy
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2>3. Cookie NON Utilizzati</h2>
          <p>
            Domy <strong>NON utilizza</strong>:
          </p>
          <ul>
            <li>Cookie di profilazione pubblicitaria</li>
            <li>Cookie di tracciamento per marketing</li>
            <li>Cookie di social media (Facebook, Twitter, ecc.)</li>
            <li>Cookie di analytics di terze parti (Google Analytics, ecc.)</li>
          </ul>
        </section>

        <section>
          <h2>4. Come Gestire i Cookie</h2>
          <p>
            Puoi gestire i cookie attraverso le impostazioni del tuo browser:
          </p>

          <h3>Chrome</h3>
          <p>
            Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti
          </p>

          <h3>Firefox</h3>
          <p>Impostazioni → Privacy e sicurezza → Cookie e dati dei siti web</p>

          <h3>Safari</h3>
          <p>Preferenze → Privacy → Gestisci dati siti web</p>

          <h3>Edge</h3>
          <p>
            Impostazioni → Cookie e autorizzazioni sito → Gestisci ed elimina
            cookie
          </p>

          <p className="warning">
            ⚠️ <strong>Attenzione:</strong> Disabilitare i cookie tecnici
            impedirà il corretto funzionamento del sito (es. non potrai
            effettuare il login).
          </p>
        </section>

        <section>
          <h2>5. Caratteristiche dei Nostri Cookie</h2>
          <ul>
            <li>
              <strong>HttpOnly:</strong> Non accessibili da JavaScript
              (protezione XSS)
            </li>
            <li>
              <strong>Secure:</strong> Trasmessi solo su HTTPS
            </li>
            <li>
              <strong>SameSite=Lax:</strong> Protezione CSRF
            </li>
          </ul>
        </section>

        <section>
          <h2>6. Local Storage</h2>
          <p>
            Oltre ai cookie, utilizziamo il Local Storage del browser per
            memorizzare preferenze non sensibili (es. tema, filtri di ricerca).
            Questi dati rimangono sul tuo dispositivo e non vengono inviati ai
            nostri server.
          </p>
        </section>

        <section>
          <h2>7. Aggiornamenti</h2>
          <p>
            Questa Cookie Policy può essere aggiornata periodicamente. Ti
            invitiamo a consultarla regolarmente.
          </p>
        </section>

        <section>
          <h2>8. Contatti</h2>
          <p>
            Per domande sulla Cookie Policy, contattaci a{" "}
            <a href="mailto:privacy@domy.it">privacy@domy.it</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default CookiePolicy;
