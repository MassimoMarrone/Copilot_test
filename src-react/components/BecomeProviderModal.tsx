import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import "../styles/Modal.css";

interface BecomeProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BecomeProviderModal: React.FC<BecomeProviderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [acceptedProviderTerms, setAcceptedProviderTerms] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const bottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + 1;
    if (bottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!acceptedProviderTerms) {
      setErrorMessage(
        "Devi accettare i Termini e Condizioni del Fornitore per continuare."
      );
      return;
    }

    setIsLoading(true);

    try {
      await authService.becomeProvider(acceptedProviderTerms);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
      alert(
        "Ottimo! Ora completa il tuo profilo fornitore per iniziare a ricevere richieste."
      );
      // Redirect to onboarding to complete profile
      navigate("/provider-onboarding");
    } catch (error: any) {
      setErrorMessage(error.message || "Registrazione come fornitore fallita");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content modal-large">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="modal-title">Diventa Fornitore</h2>

        <p style={{ marginBottom: "20px", color: "#555" }}>
          Vuoi offrire i tuoi servizi sulla piattaforma? Accetta i Termini e
          Condizioni del Fornitore per iniziare.
        </p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="terms-section">
            <h3>Termini e Condizioni Fornitore</h3>
            <div className="terms-box" onScroll={handleTermsScroll}>
              <p>
                <strong>TERMINI E CONDIZIONI PER FORNITORI</strong>
              </p>
              <p>
                1. <strong>Responsabilità del Fornitore</strong>: Come
                fornitore, ti impegni a fornire servizi di qualità e a
                completare tutti i lavori come concordato con i clienti.
              </p>
              <p>
                2. <strong>Prova Fotografica Obbligatoria</strong>: Al termine
                di ogni servizio, devi caricare una foto che dimostri il
                completamento del lavoro. Questo è obbligatorio per ricevere il
                pagamento.
              </p>
              <p>
                3. <strong>Sistema di Pagamento Escrow</strong>: I pagamenti dei
                clienti vengono trattenuti in escrow fino al completamento del
                servizio. Riceverai il pagamento solo dopo aver caricato la
                prova fotografica.
              </p>
              <p>
                4. <strong>Professionalità</strong>: Devi mantenere un
                comportamento professionale in tutte le interazioni con i
                clienti e rispettare gli orari concordati.
              </p>
              <p>
                5. <strong>Cancellazioni</strong>: Se devi cancellare un
                servizio, devi notificare il cliente almeno 24 ore prima. Le
                cancellazioni frequenti possono portare alla sospensione del tuo
                account.
              </p>
              <p>
                6. <strong>Qualità del Servizio</strong>: Ti impegni a fornire
                servizi di alta qualità. Le recensioni negative ripetute possono
                influenzare la tua visibilità sulla piattaforma.
              </p>
              <p>
                7. <strong>Commissioni</strong>: La piattaforma trattiene una
                commissione del 10% su ogni servizio completato per coprire i
                costi operativi e il sistema di pagamento sicuro.
              </p>
              <p>
                8. <strong>Privacy e Dati</strong>: Devi rispettare la privacy
                dei clienti e non utilizzare i loro dati personali per scopi non
                autorizzati.
              </p>
              <p>
                9. <strong>Controversie</strong>: In caso di controversie con i
                clienti, ti impegni a collaborare con la piattaforma per una
                risoluzione equa.
              </p>
              <p>
                10. <strong>Sospensione e Terminazione</strong>: La piattaforma
                si riserva il diritto di sospendere o terminare il tuo account
                in caso di violazione di questi termini o comportamento
                inappropriato.
              </p>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="provider-acceptedTerms"
                  checked={acceptedProviderTerms}
                  onChange={(e) => setAcceptedProviderTerms(e.target.checked)}
                  required
                  disabled={isLoading || !hasScrolledToBottom}
                />
                <span>
                  Accetto i Termini e Condizioni del Fornitore (obbligatorio)
                </span>
              </label>
              {!hasScrolledToBottom && (
                <p className="scroll-hint">
                  ⬇️ Scorri fino in fondo per accettare i termini
                </p>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="error-message show">{errorMessage}</div>
          )}

          <div className="button-group">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !hasScrolledToBottom}
            >
              {isLoading ? "Registrazione..." : "Diventa Fornitore"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BecomeProviderModal;
