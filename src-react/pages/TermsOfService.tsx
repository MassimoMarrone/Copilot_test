import { useNavigate } from "react-router-dom";
import "../styles/LegalPages.css";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Torna indietro
        </button>

        <h1>Termini e Condizioni di Servizio</h1>
        <p className="last-updated">Ultimo aggiornamento: 18 Dicembre 2025</p>

        <section>
          <h2>1. Accettazione dei Termini</h2>
          <p>
            Utilizzando la piattaforma Domy, accetti di essere vincolato da
            questi Termini e Condizioni. Se non accetti questi termini, non puoi
            utilizzare il servizio.
          </p>
        </section>

        <section>
          <h2>2. Descrizione del Servizio</h2>
          <p>
            Domy è una piattaforma online che mette in contatto clienti con
            fornitori di servizi di pulizia professionale. Domy agisce come
            intermediario e non è direttamente responsabile della prestazione
            dei servizi.
          </p>
        </section>

        <section>
          <h2>3. Registrazione e Account</h2>
          <h3>3.1 Requisiti</h3>
          <ul>
            <li>Devi avere almeno 18 anni</li>
            <li>Devi fornire informazioni accurate e veritiere</li>
            <li>Sei responsabile della sicurezza del tuo account</li>
          </ul>

          <h3>3.2 Tipi di Account</h3>
          <ul>
            <li>
              <strong>Cliente:</strong> può prenotare servizi di pulizia
            </li>
            <li>
              <strong>Fornitore:</strong> può offrire servizi dopo approvazione
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Per i Clienti</h2>
          <h3>4.1 Prenotazioni</h3>
          <ul>
            <li>Le prenotazioni sono vincolanti una volta confermate</li>
            <li>Devi fornire informazioni accurate sull'immobile</li>
            <li>Devi essere presente o garantire l'accesso all'immobile</li>
          </ul>

          <h3>4.2 Pagamenti</h3>
          <ul>
            <li>Il pagamento avviene al momento della prenotazione</li>
            <li>
              I fondi sono trattenuti in escrow fino al completamento del
              servizio
            </li>
            <li>Accettiamo carte di credito/debito tramite Stripe</li>
          </ul>

          <h3>4.3 Cancellazioni</h3>
          <ul>
            <li>
              <strong>Più di 24 ore prima:</strong> rimborso completo
            </li>
            <li>
              <strong>Meno di 24 ore:</strong> rimborso del 50%
            </li>
            <li>
              <strong>Mancata presentazione:</strong> nessun rimborso
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Per i Fornitori</h2>
          <h3>5.1 Requisiti</h3>
          <ul>
            <li>Maggiore età e residenza in Italia</li>
            <li>Partita IVA o regolare posizione fiscale</li>
            <li>Documenti di identità validi</li>
            <li>Esperienza nel settore delle pulizie</li>
          </ul>

          <h3>5.2 Obblighi</h3>
          <ul>
            <li>Fornire servizi professionali e di qualità</li>
            <li>Rispettare gli orari concordati</li>
            <li>Mantenere comportamento professionale</li>
            <li>Rispettare la privacy dei clienti</li>
            <li>Avere assicurazione RC professionale (consigliato)</li>
          </ul>

          <h3>5.3 Commissioni</h3>
          <ul>
            <li>
              Domy trattiene una commissione del 15% su ogni servizio completato
            </li>
            <li>
              Il pagamento viene rilasciato entro 5 giorni lavorativi dal
              completamento
            </li>
          </ul>

          <h3>5.4 Sospensione</h3>
          <p>
            Domy si riserva il diritto di sospendere o terminare l'account del
            fornitore in caso di:
          </p>
          <ul>
            <li>Recensioni negative ripetute</li>
            <li>Comportamento non professionale</li>
            <li>Violazione dei termini</li>
            <li>Frode o attività illegali</li>
          </ul>
        </section>

        <section>
          <h2>6. Sistema di Pagamento Escrow</h2>
          <p>Per proteggere entrambe le parti:</p>
          <ol>
            <li>Il cliente paga al momento della prenotazione</li>
            <li>I fondi sono trattenuti in modo sicuro da Stripe</li>
            <li>
              Il fornitore completa il servizio e carica prova fotografica
            </li>
            <li>I fondi vengono rilasciati al fornitore (meno commissioni)</li>
          </ol>
        </section>

        <section>
          <h2>7. Recensioni</h2>
          <ul>
            <li>
              I clienti possono lasciare recensioni dopo il completamento del
              servizio
            </li>
            <li>
              Le recensioni devono essere oneste e basate sull'esperienza reale
            </li>
            <li>
              Domy si riserva il diritto di rimuovere recensioni false o
              offensive
            </li>
            <li>I fornitori possono rispondere alle recensioni</li>
          </ul>
        </section>

        <section>
          <h2>8. Responsabilità</h2>
          <h3>8.1 Limitazioni</h3>
          <p>Domy non è responsabile per:</p>
          <ul>
            <li>La qualità dei servizi forniti dai fornitori</li>
            <li>Danni causati durante l'esecuzione del servizio</li>
            <li>Dispute tra clienti e fornitori</li>
            <li>Interruzioni tecniche della piattaforma</li>
          </ul>

          <h3>8.2 Assicurazione</h3>
          <p>
            Si consiglia ai fornitori di avere un'assicurazione RC
            professionale. I clienti sono invitati a verificare la copertura
            assicurativa del fornitore.
          </p>
        </section>

        <section>
          <h2>9. Dispute</h2>
          <p>In caso di problemi:</p>
          <ol>
            <li>Contatta prima l'altra parte tramite la chat</li>
            <li>Se non risolto, contatta il supporto Domy</li>
            <li>Domy medierà la disputa e prenderà una decisione</li>
            <li>
              La decisione di Domy è finale per quanto riguarda i rimborsi
            </li>
          </ol>
        </section>

        <section>
          <h2>10. Proprietà Intellettuale</h2>
          <p>
            Tutti i contenuti della piattaforma (logo, design, testi, software)
            sono di proprietà di Domy e protetti da copyright.
          </p>
        </section>

        <section>
          <h2>11. Comportamenti Vietati</h2>
          <ul>
            <li>Fornire informazioni false</li>
            <li>Creare account multipli</li>
            <li>Tentare di aggirare il sistema di pagamento</li>
            <li>Molestare altri utenti</li>
            <li>Utilizzare la piattaforma per attività illegali</li>
            <li>Violare la privacy di altri utenti</li>
          </ul>
        </section>

        <section>
          <h2>12. Modifiche ai Termini</h2>
          <p>
            Domy può modificare questi termini in qualsiasi momento. Le
            modifiche saranno comunicate via email o notifica sulla piattaforma.
            L'uso continuato del servizio implica accettazione delle modifiche.
          </p>
        </section>

        <section>
          <h2>13. Legge Applicabile</h2>
          <p>
            Questi termini sono regolati dalla legge italiana. Per qualsiasi
            controversia sarà competente il Foro di Milano.
          </p>
        </section>

        <section>
          <h2>14. Contatti</h2>
          <p>Per domande sui Termini e Condizioni:</p>
          <ul>
            <li>
              Email: <a href="mailto:support@domy.it">support@domy.it</a>
            </li>
            <li>Indirizzo: [Inserire indirizzo legale]</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
