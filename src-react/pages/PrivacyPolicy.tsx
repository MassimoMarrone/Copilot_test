import { useNavigate } from "react-router-dom";
import "../styles/LegalPages.css";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Torna indietro
        </button>

        <h1>Informativa sulla Privacy</h1>
        <p className="last-updated">Ultimo aggiornamento: 18 Dicembre 2025</p>

        <section>
          <h2>1. Titolare del Trattamento</h2>
          <p>
            Il Titolare del trattamento dei dati personali è <strong>Domy</strong>, 
            con sede legale in Italia.
          </p>
          <p>Email di contatto: <a href="mailto:privacy@domy.it">privacy@domy.it</a></p>
        </section>

        <section>
          <h2>2. Dati Raccolti</h2>
          <p>Raccogliamo i seguenti dati personali:</p>
          
          <h3>2.1 Dati forniti direttamente dall'utente:</h3>
          <ul>
            <li><strong>Dati di registrazione:</strong> nome, cognome, email, password (criptata), numero di telefono</li>
            <li><strong>Dati per i fornitori:</strong> codice fiscale, partita IVA, IBAN, indirizzo, documenti di identità</li>
            <li><strong>Dati di pagamento:</strong> elaborati da Stripe (non memorizziamo i dati delle carte)</li>
          </ul>

          <h3>2.2 Dati raccolti automaticamente:</h3>
          <ul>
            <li>Indirizzo IP</li>
            <li>Tipo di browser e dispositivo</li>
            <li>Pagine visitate e tempo di permanenza</li>
            <li>Dati di geolocalizzazione (solo se autorizzati)</li>
          </ul>
        </section>

        <section>
          <h2>3. Finalità del Trattamento</h2>
          <p>I tuoi dati vengono utilizzati per:</p>
          <ul>
            <li>Creare e gestire il tuo account</li>
            <li>Fornire i servizi richiesti (prenotazioni, pagamenti, chat)</li>
            <li>Verificare l'identità dei fornitori</li>
            <li>Comunicazioni relative al servizio (email transazionali)</li>
            <li>Migliorare la piattaforma e l'esperienza utente</li>
            <li>Adempiere a obblighi legali</li>
          </ul>
        </section>

        <section>
          <h2>4. Base Giuridica</h2>
          <p>Il trattamento dei dati si basa su:</p>
          <ul>
            <li><strong>Contratto:</strong> necessario per fornire il servizio</li>
            <li><strong>Consenso:</strong> per comunicazioni di marketing (se fornito)</li>
            <li><strong>Obbligo legale:</strong> per adempimenti fiscali e normativi</li>
            <li><strong>Interesse legittimo:</strong> per sicurezza e prevenzione frodi</li>
          </ul>
        </section>

        <section>
          <h2>5. Condivisione dei Dati</h2>
          <p>I tuoi dati possono essere condivisi con:</p>
          <ul>
            <li><strong>Stripe:</strong> per l'elaborazione dei pagamenti</li>
            <li><strong>Cloudinary:</strong> per l'archiviazione sicura dei documenti</li>
            <li><strong>Brevo (Sendinblue):</strong> per l'invio di email</li>
            <li><strong>Google:</strong> per OAuth e Google Maps</li>
            <li><strong>Sentry:</strong> per il monitoraggio degli errori (dati anonimi)</li>
            <li><strong>Autorità competenti:</strong> se richiesto dalla legge</li>
          </ul>
          <p>Non vendiamo mai i tuoi dati a terzi.</p>
        </section>

        <section>
          <h2>6. Conservazione dei Dati</h2>
          <p>I dati vengono conservati per:</p>
          <ul>
            <li><strong>Dati account:</strong> fino alla cancellazione dell'account</li>
            <li><strong>Dati fiscali:</strong> 10 anni (obbligo di legge)</li>
            <li><strong>Log di sicurezza:</strong> 12 mesi</li>
            <li><strong>Documenti fornitori:</strong> fino a 5 anni dopo la cessazione del rapporto</li>
          </ul>
        </section>

        <section>
          <h2>7. I Tuoi Diritti (GDPR)</h2>
          <p>Hai il diritto di:</p>
          <ul>
            <li><strong>Accesso:</strong> richiedere una copia dei tuoi dati</li>
            <li><strong>Rettifica:</strong> correggere dati inesatti</li>
            <li><strong>Cancellazione:</strong> richiedere la cancellazione dei dati ("diritto all'oblio")</li>
            <li><strong>Portabilità:</strong> ricevere i tuoi dati in formato leggibile</li>
            <li><strong>Opposizione:</strong> opporti al trattamento per marketing</li>
            <li><strong>Limitazione:</strong> limitare il trattamento in determinati casi</li>
          </ul>
          <p>
            Per esercitare questi diritti, contattaci a{" "}
            <a href="mailto:privacy@domy.it">privacy@domy.it</a>
          </p>
        </section>

        <section>
          <h2>8. Sicurezza dei Dati</h2>
          <p>Adottiamo misure di sicurezza tecniche e organizzative:</p>
          <ul>
            <li>Crittografia HTTPS per tutte le comunicazioni</li>
            <li>Password hashate con bcrypt</li>
            <li>Cookie HttpOnly e Secure</li>
            <li>Accesso ai dati limitato al personale autorizzato</li>
            <li>Backup regolari e sicuri</li>
            <li>Monitoraggio continuo delle vulnerabilità</li>
          </ul>
        </section>

        <section>
          <h2>9. Cookie</h2>
          <p>
            Utilizziamo cookie tecnici necessari per il funzionamento del sito.
            Per maggiori informazioni, consulta la nostra{" "}
            <a href="/cookie-policy">Cookie Policy</a>.
          </p>
        </section>

        <section>
          <h2>10. Modifiche alla Privacy Policy</h2>
          <p>
            Ci riserviamo il diritto di modificare questa informativa. 
            Le modifiche saranno pubblicate su questa pagina con la data di aggiornamento.
            Per modifiche sostanziali, ti invieremo una notifica.
          </p>
        </section>

        <section>
          <h2>11. Contatti e Reclami</h2>
          <p>
            Per domande o reclami sulla privacy, contattaci a{" "}
            <a href="mailto:privacy@domy.it">privacy@domy.it</a>
          </p>
          <p>
            Hai anche il diritto di presentare reclamo al Garante per la Protezione 
            dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>).
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
