import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/ProviderOnboarding.css";

// Validation functions
const validators = {
  // Codice Fiscale: 16 caratteri alfanumerici (6 lettere + 2 numeri + 1 lettera + 2 numeri + 1 lettera + 3 numeri + 1 lettera)
  fiscalCode: (value: string): string | null => {
    if (!value) return null; // Optional field
    const cleaned = value.toUpperCase().replace(/\s/g, "");
    if (cleaned.length !== 16) {
      return "Il codice fiscale deve essere di 16 caratteri";
    }
    const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    if (!cfRegex.test(cleaned)) {
      return "Formato codice fiscale non valido";
    }
    return null;
  },

  // Partita IVA: 11 cifre
  vatNumber: (value: string): string | null => {
    if (!value) return null; // Optional field
    const cleaned = value.replace(/\s/g, "");
    if (!/^\d{11}$/.test(cleaned)) {
      return "La partita IVA deve essere di 11 cifre";
    }
    return null;
  },

  // Telefono italiano: +39 o 0039 seguito da 9-10 cifre, oppure solo 9-10 cifre
  phone: (value: string): string | null => {
    if (!value) return "Il numero di telefono è obbligatorio";
    const cleaned = value.replace(/[\s\-\.]/g, "");
    // Accetta: +39XXXXXXXXXX, 0039XXXXXXXXXX, 3XXXXXXXXX, 0XXXXXXXXX
    const phoneRegex = /^(\+39|0039)?[0-9]{9,10}$/;
    if (!phoneRegex.test(cleaned)) {
      return "Formato telefono non valido (es: +39 333 1234567)";
    }
    return null;
  },

  // IBAN italiano: IT + 2 cifre di controllo + 1 lettera + 22 caratteri alfanumerici
  iban: (value: string): string | null => {
    if (!value) return "L'IBAN è obbligatorio";
    const cleaned = value.toUpperCase().replace(/\s/g, "");
    if (cleaned.length !== 27) {
      return "L'IBAN italiano deve essere di 27 caratteri";
    }
    const ibanRegex = /^IT[0-9]{2}[A-Z][0-9]{10}[A-Z0-9]{12}$/;
    if (!ibanRegex.test(cleaned)) {
      return "Formato IBAN non valido (es: IT60X0542811101000000123456)";
    }
    return null;
  },

  // CAP: 5 cifre
  postalCode: (value: string): string | null => {
    if (!value) return "Il CAP è obbligatorio";
    if (!/^\d{5}$/.test(value)) {
      return "Il CAP deve essere di 5 cifre";
    }
    return null;
  },

  // Data di nascita: deve essere maggiorenne
  dateOfBirth: (value: string): string | null => {
    if (!value) return "La data di nascita è obbligatoria";
    const birthDate = new Date(value);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge =
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? age - 1
        : age;
    if (actualAge < 18) {
      return "Devi essere maggiorenne per registrarti come fornitore";
    }
    if (actualAge > 120) {
      return "Data di nascita non valida";
    }
    return null;
  },

  // Numero documento
  idDocumentNumber: (value: string): string | null => {
    if (!value) return "Il numero del documento è obbligatorio";
    if (value.length < 5 || value.length > 20) {
      return "Numero documento non valido";
    }
    return null;
  },

  // Scadenza documento: non deve essere scaduto
  idDocumentExpiry: (value: string): string | null => {
    if (!value) return "La data di scadenza è obbligatoria";
    const expiryDate = new Date(value);
    const today = new Date();
    if (expiryDate < today) {
      return "Il documento è scaduto";
    }
    return null;
  },
};

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

          // Set current step based on progress or status
          if (data.user.onboardingStatus === "rejected") {
            // Show rejection message first (step 0)
            setCurrentStep(0);
          } else if (data.user.onboardingStep) {
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

  // Validate a single field and update fieldErrors
  const validateField = (fieldName: string, value: string): string | null => {
    const validator = validators[fieldName as keyof typeof validators];
    if (validator) {
      return validator(value);
    }
    return null;
  };

  // Validate all fields for a specific step
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.firstName.trim())
        errors.firstName = "Il nome è obbligatorio";
      if (!formData.lastName.trim())
        errors.lastName = "Il cognome è obbligatorio";

      const dobError = validators.dateOfBirth(formData.dateOfBirth);
      if (dobError) errors.dateOfBirth = dobError;

      const cfError = validators.fiscalCode(formData.fiscalCode);
      if (cfError) errors.fiscalCode = cfError;

      const vatError = validators.vatNumber(formData.vatNumber);
      if (vatError) errors.vatNumber = vatError;

      const phoneError = validators.phone(formData.phone);
      if (phoneError) errors.phone = phoneError;

      if (!formData.address.trim())
        errors.address = "L'indirizzo è obbligatorio";
      if (!formData.city.trim()) errors.city = "La città è obbligatoria";

      const capError = validators.postalCode(formData.postalCode);
      if (capError) errors.postalCode = capError;
    }

    if (step === 2) {
      const docNumError = validators.idDocumentNumber(
        formData.idDocumentNumber
      );
      if (docNumError) errors.idDocumentNumber = docNumError;

      const docExpError = validators.idDocumentExpiry(
        formData.idDocumentExpiry
      );
      if (docExpError) errors.idDocumentExpiry = docExpError;
    }

    if (step === 3) {
      const ibanError = validators.iban(formData.iban);
      if (ibanError) errors.iban = ibanError;

      if (!formData.bankAccountHolder.trim()) {
        errors.bankAccountHolder = "L'intestatario del conto è obbligatorio";
      }
    }

    if (step === 4) {
      if (!formData.workingZones.trim()) {
        errors.workingZones = "Le zone di lavoro sono obbligatorie";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle field blur for real-time validation
  const handleFieldBlur = (fieldName: string) => {
    const value = formData[fieldName as keyof typeof formData];
    if (typeof value === "string") {
      const error = validateField(fieldName, value);
      setFieldErrors((prev) => {
        if (error) {
          return { ...prev, [fieldName]: error };
        } else {
          const { [fieldName]: _, ...rest } = prev;
          return rest;
        }
      });
    }
  };

  const saveStep = async (step: number) => {
    // Validate before saving
    if (!validateStep(step)) {
      setError("Correggi gli errori nei campi evidenziati");
      return;
    }

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
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Caricamento...</p>
        </div>
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
            I tuoi documenti sono in fase di revisione. Riceverai una email
            quando il processo sarà completato.
          </p>
        </div>
      </div>
    );
  }

  // If rejected - show form to allow modifications
  const isRejected = status?.user.onboardingStatus === "rejected";

  if (isRejected && currentStep === 0) {
    // Show rejection message first
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
          <p className="rejection-help">
            Puoi correggere i problemi indicati e inviare nuovamente la
            richiesta.
          </p>
          <button
            className="btn-primary"
            onClick={() => {
              // Start editing from step 1
              setCurrentStep(1);
            }}
          >
            Modifica Richiesta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <h1>Completa il tuo Profilo Provider</h1>

      {/* Rejection warning banner */}
      {isRejected && currentStep > 0 && (
        <div className="alert alert-warning rejection-banner">
          <strong>⚠️ Richiesta precedentemente rifiutata</strong>
          <p>Motivo: {status?.user.onboardingRejectionReason}</p>
          <p>Correggi i dati e invia nuovamente la richiesta.</p>
        </div>
      )}

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
            <div
              className={`form-group ${
                fieldErrors.firstName ? "has-error" : ""
              }`}
            >
              <label>Nome *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("firstName")}
                required
              />
              {fieldErrors.firstName && (
                <span className="field-error">{fieldErrors.firstName}</span>
              )}
            </div>
            <div
              className={`form-group ${
                fieldErrors.lastName ? "has-error" : ""
              }`}
            >
              <label>Cognome *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("lastName")}
                required
              />
              {fieldErrors.lastName && (
                <span className="field-error">{fieldErrors.lastName}</span>
              )}
            </div>
            <div
              className={`form-group ${
                fieldErrors.dateOfBirth ? "has-error" : ""
              }`}
            >
              <label>Data di Nascita *</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("dateOfBirth")}
                required
              />
              {fieldErrors.dateOfBirth && (
                <span className="field-error">{fieldErrors.dateOfBirth}</span>
              )}
            </div>
            <div
              className={`form-group ${
                fieldErrors.fiscalCode ? "has-error" : ""
              }`}
            >
              <label>Codice Fiscale *</label>
              <input
                type="text"
                name="fiscalCode"
                value={formData.fiscalCode}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("fiscalCode")}
                maxLength={16}
                placeholder="RSSMRA85M01H501Z"
                required
              />
              {fieldErrors.fiscalCode && (
                <span className="field-error">{fieldErrors.fiscalCode}</span>
              )}
            </div>
            <div
              className={`form-group ${
                fieldErrors.vatNumber ? "has-error" : ""
              }`}
            >
              <label>Partita IVA (opzionale)</label>
              <input
                type="text"
                name="vatNumber"
                value={formData.vatNumber}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("vatNumber")}
                maxLength={11}
                placeholder="12345678901"
              />
              {fieldErrors.vatNumber && (
                <span className="field-error">{fieldErrors.vatNumber}</span>
              )}
            </div>
            <div
              className={`form-group ${fieldErrors.phone ? "has-error" : ""}`}
            >
              <label>Telefono *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("phone")}
                placeholder="+39 333 1234567"
                required
              />
              {fieldErrors.phone && (
                <span className="field-error">{fieldErrors.phone}</span>
              )}
            </div>
            <div
              className={`form-group full-width ${
                fieldErrors.address ? "has-error" : ""
              }`}
            >
              <label>Indirizzo *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("address")}
                required
              />
              {fieldErrors.address && (
                <span className="field-error">{fieldErrors.address}</span>
              )}
            </div>
            <div
              className={`form-group ${fieldErrors.city ? "has-error" : ""}`}
            >
              <label>Città *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("city")}
                required
              />
              {fieldErrors.city && (
                <span className="field-error">{fieldErrors.city}</span>
              )}
            </div>
            <div
              className={`form-group ${
                fieldErrors.postalCode ? "has-error" : ""
              }`}
            >
              <label>CAP *</label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("postalCode")}
                maxLength={5}
                placeholder="00100"
                required
              />
              {fieldErrors.postalCode && (
                <span className="field-error">{fieldErrors.postalCode}</span>
              )}
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
            <div
              className={`form-group ${
                fieldErrors.idDocumentNumber ? "has-error" : ""
              }`}
            >
              <label>Numero Documento *</label>
              <input
                type="text"
                name="idDocumentNumber"
                value={formData.idDocumentNumber}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("idDocumentNumber")}
                required
              />
              {fieldErrors.idDocumentNumber && (
                <span className="field-error">
                  {fieldErrors.idDocumentNumber}
                </span>
              )}
            </div>
            <div
              className={`form-group ${
                fieldErrors.idDocumentExpiry ? "has-error" : ""
              }`}
            >
              <label>Scadenza Documento *</label>
              <input
                type="date"
                name="idDocumentExpiry"
                value={formData.idDocumentExpiry}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("idDocumentExpiry")}
                required
              />
              {fieldErrors.idDocumentExpiry && (
                <span className="field-error">
                  {fieldErrors.idDocumentExpiry}
                </span>
              )}
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
            <div
              className={`form-group full-width ${
                fieldErrors.iban ? "has-error" : ""
              }`}
            >
              <label>IBAN *</label>
              <input
                type="text"
                name="iban"
                value={formData.iban}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("iban")}
                placeholder="IT60X0542811101000000123456"
                required
              />
              {fieldErrors.iban && (
                <span className="field-error">{fieldErrors.iban}</span>
              )}
            </div>
            <div
              className={`form-group full-width ${
                fieldErrors.bankAccountHolder ? "has-error" : ""
              }`}
            >
              <label>Intestatario Conto *</label>
              <input
                type="text"
                name="bankAccountHolder"
                value={formData.bankAccountHolder}
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur("bankAccountHolder")}
                required
              />
              {fieldErrors.bankAccountHolder && (
                <span className="field-error">
                  {fieldErrors.bankAccountHolder}
                </span>
              )}
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
