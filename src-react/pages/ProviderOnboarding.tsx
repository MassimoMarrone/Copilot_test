import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/ProviderOnboarding.css";

interface OnboardingStatus {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    onboardingStatus: string | null;
    onboardingStep: number;
    onboardingRejectionReason: string | null;
    // Step 1
    dateOfBirth: string | null;
    fiscalCode: string | null;
    vatNumber: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    // Step 2
    idDocumentType: string | null;
    idDocumentNumber: string | null;
    idDocumentExpiry: string | null;
    idDocumentFrontUrl: string | null;
    idDocumentBackUrl: string | null;
    // Step 3
    iban: string | null;
    bankAccountHolder: string | null;
    // Step 4
    workingZones: string | null;
    yearsOfExperience: number | null;
    hasOwnEquipment: boolean;
    insuranceNumber: string | null;
    insuranceExpiry: string | null;
  };
  steps: {
    step1: { complete: boolean };
    step2: { complete: boolean };
    step3: { complete: boolean };
    step4: { complete: boolean };
  };
  overallProgress: string;
  isComplete: boolean;
  canSubmitForReview: boolean;
}

const ProviderOnboarding: React.FC = () => {
  const { user: authUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    fiscalCode: "",
    vatNumber: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    // Step 2
    idDocumentType: "carta_identita",
    idDocumentNumber: "",
    idDocumentExpiry: "",
    // Step 3
    iban: "",
    bankAccountHolder: "",
    // Step 4
    workingZones: "",
    yearsOfExperience: "",
    hasOwnEquipment: false,
    insuranceNumber: "",
    insuranceExpiry: "",
  });

  // Document uploads
  const [frontDocument, setFrontDocument] = useState<File | null>(null);
  const [backDocument, setBackDocument] = useState<File | null>(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/onboarding/status", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);

        // Pre-fill form with existing data
        if (data.user) {
          setFormData({
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            dateOfBirth: data.user.dateOfBirth
              ? data.user.dateOfBirth.split("T")[0]
              : "",
            fiscalCode: data.user.fiscalCode || "",
            vatNumber: data.user.vatNumber || "",
            phone: data.user.phone || "",
            address: data.user.address || "",
            city: data.user.city || "",
            postalCode: data.user.postalCode || "",
            idDocumentType: data.user.idDocumentType || "carta_identita",
            idDocumentNumber: data.user.idDocumentNumber || "",
            idDocumentExpiry: data.user.idDocumentExpiry
              ? data.user.idDocumentExpiry.split("T")[0]
              : "",
            iban: data.user.iban || "",
            bankAccountHolder: data.user.bankAccountHolder || "",
            workingZones: data.user.workingZones || "",
            yearsOfExperience: data.user.yearsOfExperience?.toString() || "",
            hasOwnEquipment: data.user.hasOwnEquipment || false,
            insuranceNumber: data.user.insuranceNumber || "",
            insuranceExpiry: data.user.insuranceExpiry
              ? data.user.insuranceExpiry.split("T")[0]
              : "",
          });

          // Set current step based on progress
          if (data.user.onboardingStep) {
            setCurrentStep(Math.min(data.user.onboardingStep + 1, 4));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching onboarding status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const uploadDocument = async (file: File, side: "front" | "back") => {
    const setUploading =
      side === "front" ? setUploadingFront : setUploadingBack;
    setUploading(true);
    setError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("document", file);
      formDataUpload.append("documentSide", side);

      const response = await fetch("/api/onboarding/upload-document", {
        method: "POST",
        credentials: "include",
        body: formDataUpload,
      });

      if (response.ok) {
        await fetchStatus();
        setSuccess(
          `Documento ${
            side === "front" ? "fronte" : "retro"
          } caricato con successo!`
        );
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Errore durante il caricamento");
      }
    } catch (err) {
      setError("Errore durante il caricamento del documento");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (side === "front") {
      setFrontDocument(file);
    } else {
      setBackDocument(file);
    }

    // Auto-upload
    await uploadDocument(file, side);
  };

  const saveStep = async (step: number) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step,
          ...formData,
        }),
      });

      if (response.ok) {
        await fetchStatus();
        setSuccess("Dati salvati con successo!");
        setTimeout(() => setSuccess(null), 3000);

        if (step < 4) {
          setCurrentStep(step + 1);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Errore durante il salvataggio");
      }
    } catch (err) {
      setError("Errore durante il salvataggio dei dati");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="onboarding-container">
        <div className="loading-spinner">Caricamento...</div>
      </div>
    );
  }

  // If already approved
  if (status?.user.onboardingStatus === "approved") {
    return (
      <div className="onboarding-container">
        <div className="onboarding-success">
          <h2>✅ Onboarding Completato</h2>
          <p>
            Il tuo profilo è stato verificato e approvato. Puoi iniziare a
            offrire i tuoi servizi!
          </p>
        </div>
      </div>
    );
  }

  // If under review
  if (status?.user.onboardingStatus === "under_review") {
    return (
      <div className="onboarding-container">
        <div className="onboarding-review">
          <h2>⏳ In Revisione</h2>
          <p>
            I tuoi documenti sono in fase di revisione. Riceverai una notifica
            quando il processo sarà completato.
          </p>
        </div>
      </div>
    );
  }

  // If rejected
  if (status?.user.onboardingStatus === "rejected") {
    return (
      <div className="onboarding-container">
        <div className="onboarding-rejected">
          <h2>❌ Richiesta Rifiutata</h2>
          <p>La tua richiesta di onboarding è stata rifiutata.</p>
          {status.user.onboardingRejectionReason && (
            <div className="rejection-reason">
              <strong>Motivo:</strong> {status.user.onboardingRejectionReason}
            </div>
          )}
          <button
            className="btn-primary"
            onClick={() => {
              // Reset and allow retry
              setCurrentStep(1);
            }}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <h1>Completa il tuo Profilo Provider</h1>

      {/* Progress indicator */}
      <div className="progress-steps">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`step ${currentStep === step ? "active" : ""} ${
              status?.steps[`step${step}` as keyof typeof status.steps]
                ?.complete
                ? "completed"
                : ""
            }`}
            onClick={() => setCurrentStep(step)}
          >
            <span className="step-number">{step}</span>
            <span className="step-label">
              {step === 1 && "Dati Personali"}
              {step === 2 && "Documenti"}
              {step === 3 && "Pagamento"}
              {step === 4 && "Lavoro"}
            </span>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Step 1: Personal Data */}
      {currentStep === 1 && (
        <div className="step-content">
          <h2>Dati Personali</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Cognome *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Data di Nascita *</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Codice Fiscale *</label>
              <input
                type="text"
                name="fiscalCode"
                value={formData.fiscalCode}
                onChange={handleInputChange}
                maxLength={16}
                required
              />
            </div>
            <div className="form-group">
              <label>Partita IVA (opzionale)</label>
              <input
                type="text"
                name="vatNumber"
                value={formData.vatNumber}
                onChange={handleInputChange}
                maxLength={11}
              />
            </div>
            <div className="form-group">
              <label>Telefono *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group full-width">
              <label>Indirizzo *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Città *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>CAP *</label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                maxLength={5}
                required
              />
            </div>
          </div>
          <div className="step-actions">
            <button
              className="btn-primary"
              onClick={() => saveStep(1)}
              disabled={saving}
            >
              {saving ? "Salvataggio..." : "Salva e Continua"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Documents */}
      {currentStep === 2 && (
        <div className="step-content">
          <h2>Documenti di Identità</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Tipo Documento *</label>
              <select
                name="idDocumentType"
                value={formData.idDocumentType}
                onChange={handleInputChange}
              >
                <option value="carta_identita">Carta d'Identità</option>
                <option value="patente">Patente di Guida</option>
                <option value="passaporto">Passaporto</option>
              </select>
            </div>
            <div className="form-group">
              <label>Numero Documento *</label>
              <input
                type="text"
                name="idDocumentNumber"
                value={formData.idDocumentNumber}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Scadenza Documento *</label>
              <input
                type="date"
                name="idDocumentExpiry"
                value={formData.idDocumentExpiry}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="document-uploads">
            <div className="upload-box">
              <label>Foto Fronte Documento *</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileChange(e, "front")}
                disabled={uploadingFront}
              />
              {uploadingFront && (
                <span className="uploading">Caricamento...</span>
              )}
              {status?.user.idDocumentFrontUrl && (
                <div className="uploaded-preview">
                  ✅ Documento fronte caricato
                </div>
              )}
            </div>
            <div className="upload-box">
              <label>Foto Retro Documento *</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileChange(e, "back")}
                disabled={uploadingBack}
              />
              {uploadingBack && (
                <span className="uploading">Caricamento...</span>
              )}
              {status?.user.idDocumentBackUrl && (
                <div className="uploaded-preview">
                  ✅ Documento retro caricato
                </div>
              )}
            </div>
          </div>

          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
              Indietro
            </button>
            <button
              className="btn-primary"
              onClick={() => saveStep(2)}
              disabled={
                saving ||
                !status?.user.idDocumentFrontUrl ||
                !status?.user.idDocumentBackUrl
              }
            >
              {saving ? "Salvataggio..." : "Salva e Continua"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment Info */}
      {currentStep === 3 && (
        <div className="step-content">
          <h2>Dati Bancari</h2>
          <p className="step-description">
            Questi dati verranno utilizzati per accreditare i pagamenti dei tuoi
            servizi.
          </p>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>IBAN *</label>
              <input
                type="text"
                name="iban"
                value={formData.iban}
                onChange={handleInputChange}
                placeholder="IT60X0542811101000000123456"
                required
              />
            </div>
            <div className="form-group full-width">
              <label>Intestatario Conto *</label>
              <input
                type="text"
                name="bankAccountHolder"
                value={formData.bankAccountHolder}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setCurrentStep(2)}>
              Indietro
            </button>
            <button
              className="btn-primary"
              onClick={() => saveStep(3)}
              disabled={saving}
            >
              {saving ? "Salvataggio..." : "Salva e Continua"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Work Info */}
      {currentStep === 4 && (
        <div className="step-content">
          <h2>Informazioni Lavorative</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Zone di Lavoro * (CAP o città, separati da virgola)</label>
              <textarea
                name="workingZones"
                value={formData.workingZones}
                onChange={handleInputChange}
                placeholder="es. 00100, 00118, Roma Centro, Roma Nord"
                rows={3}
                required
              />
            </div>
            <div className="form-group">
              <label>Anni di Esperienza *</label>
              <input
                type="number"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleInputChange}
                min={0}
                max={50}
                required
              />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="hasOwnEquipment"
                  checked={formData.hasOwnEquipment}
                  onChange={handleInputChange}
                />
                Dispongo di attrezzatura propria
              </label>
            </div>
            <div className="form-group">
              <label>Numero Polizza RC (opzionale)</label>
              <input
                type="text"
                name="insuranceNumber"
                value={formData.insuranceNumber}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Scadenza Polizza</label>
              <input
                type="date"
                name="insuranceExpiry"
                value={formData.insuranceExpiry}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <div className="step-actions">
            <button className="btn-secondary" onClick={() => setCurrentStep(3)}>
              Indietro
            </button>
            <button
              className="btn-primary"
              onClick={() => saveStep(4)}
              disabled={saving}
            >
              {saving ? "Salvataggio..." : "Invia per Revisione"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderOnboarding;
