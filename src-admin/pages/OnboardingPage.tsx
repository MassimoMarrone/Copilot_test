import React, { useState, useEffect } from "react";
import "../styles/OnboardingPage.css";

interface OnboardingRequest {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  onboardingStatus: string;
  onboardingStep: number;
  createdAt: string;
  phone: string | null;
  city: string | null;
}

interface OnboardingDetails {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  onboardingStatus: string;
  onboardingStep: number;
  createdAt: string;
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
}

const OnboardingPage: React.FC = () => {
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<OnboardingDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/admin/onboarding/pending", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Error fetching onboarding requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/admin/onboarding/${id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedRequest(data);
      }
    } catch (error) {
      console.error("Error fetching onboarding details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/onboarding/${selectedRequest.id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        alert("Fornitore approvato con successo!");
        setSelectedRequest(null);
        fetchRequests();
      } else {
        const error = await response.json();
        alert(error.error || "Errore durante l'approvazione");
      }
    } catch (error) {
      alert("Errore durante l'approvazione");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      alert("Inserisci un motivo per il rifiuto");
      return;
    }
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/onboarding/${selectedRequest.id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (response.ok) {
        alert("Richiesta rifiutata");
        setSelectedRequest(null);
        setShowRejectModal(false);
        setRejectionReason("");
        fetchRequests();
      } else {
        const error = await response.json();
        alert(error.error || "Errore durante il rifiuto");
      }
    } catch (error) {
      alert("Errore durante il rifiuto");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: "In attesa", className: "badge-warning" },
      documents_uploaded: { label: "Documenti caricati", className: "badge-info" },
      under_review: { label: "In revisione", className: "badge-primary" },
      approved: { label: "Approvato", className: "badge-success" },
      rejected: { label: "Rifiutato", className: "badge-danger" },
    };
    const badge = badges[status] || { label: status, className: "badge-secondary" };
    return <span className={`badge ${badge.className}`}>{badge.label}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="onboarding-page">
        <div className="loading">Caricamento richieste...</div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <h1>Richieste Onboarding Fornitori</h1>

      <div className="onboarding-layout">
        {/* Lista richieste */}
        <div className="requests-list">
          <h2>Richieste in attesa ({requests.length})</h2>
          {requests.length === 0 ? (
            <p className="no-requests">Nessuna richiesta in attesa</p>
          ) : (
            <ul>
              {requests.map((request) => (
                <li
                  key={request.id}
                  className={`request-item ${selectedRequest?.id === request.id ? "selected" : ""}`}
                  onClick={() => fetchDetails(request.id)}
                >
                  <div className="request-name">
                    {request.firstName} {request.lastName || request.email}
                  </div>
                  <div className="request-meta">
                    <span>{request.city || "Città N/D"}</span>
                    <span>{formatDate(request.createdAt)}</span>
                  </div>
                  <div className="request-status">
                    {getStatusBadge(request.onboardingStatus)}
                    <span className="step-indicator">Step {request.onboardingStep}/4</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dettagli richiesta */}
        <div className="request-details">
          {detailsLoading ? (
            <div className="loading">Caricamento dettagli...</div>
          ) : selectedRequest ? (
            <>
              <h2>Dettagli Richiesta</h2>
              
              <div className="details-section">
                <h3>👤 Dati Personali</h3>
                <div className="details-grid">
                  <div><strong>Nome:</strong> {selectedRequest.firstName || "N/D"}</div>
                  <div><strong>Cognome:</strong> {selectedRequest.lastName || "N/D"}</div>
                  <div><strong>Email:</strong> {selectedRequest.email}</div>
                  <div><strong>Telefono:</strong> {selectedRequest.phone || "N/D"}</div>
                  <div><strong>Data di nascita:</strong> {selectedRequest.dateOfBirth ? formatDate(selectedRequest.dateOfBirth) : "N/D"}</div>
                  <div><strong>Codice Fiscale:</strong> {selectedRequest.fiscalCode || "N/D"}</div>
                  <div><strong>P.IVA:</strong> {selectedRequest.vatNumber || "N/D"}</div>
                </div>
              </div>

              <div className="details-section">
                <h3>📍 Indirizzo</h3>
                <div className="details-grid">
                  <div><strong>Indirizzo:</strong> {selectedRequest.address || "N/D"}</div>
                  <div><strong>Città:</strong> {selectedRequest.city || "N/D"}</div>
                  <div><strong>CAP:</strong> {selectedRequest.postalCode || "N/D"}</div>
                </div>
              </div>

              <div className="details-section">
                <h3>🪪 Documento di Identità</h3>
                <div className="details-grid">
                  <div><strong>Tipo:</strong> {selectedRequest.idDocumentType || "N/D"}</div>
                  <div><strong>Numero:</strong> {selectedRequest.idDocumentNumber || "N/D"}</div>
                  <div><strong>Scadenza:</strong> {selectedRequest.idDocumentExpiry ? formatDate(selectedRequest.idDocumentExpiry) : "N/D"}</div>
                </div>
                <div className="document-images">
                  {selectedRequest.idDocumentFrontUrl && (
                    <div className="document-preview">
                      <strong>Fronte:</strong>
                      <a href={selectedRequest.idDocumentFrontUrl} target="_blank" rel="noopener noreferrer">
                        Visualizza documento
                      </a>
                    </div>
                  )}
                  {selectedRequest.idDocumentBackUrl && (
                    <div className="document-preview">
                      <strong>Retro:</strong>
                      <a href={selectedRequest.idDocumentBackUrl} target="_blank" rel="noopener noreferrer">
                        Visualizza documento
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="details-section">
                <h3>🏦 Dati Bancari</h3>
                <div className="details-grid">
                  <div><strong>IBAN:</strong> {selectedRequest.iban || "N/D"}</div>
                  <div><strong>Intestatario:</strong> {selectedRequest.bankAccountHolder || "N/D"}</div>
                </div>
              </div>

              <div className="details-section">
                <h3>🔧 Informazioni Lavorative</h3>
                <div className="details-grid">
                  <div><strong>Zone di lavoro:</strong> {selectedRequest.workingZones || "N/D"}</div>
                  <div><strong>Anni esperienza:</strong> {selectedRequest.yearsOfExperience || "N/D"}</div>
                  <div><strong>Attrezzatura propria:</strong> {selectedRequest.hasOwnEquipment ? "Sì" : "No"}</div>
                  <div><strong>N. Assicurazione:</strong> {selectedRequest.insuranceNumber || "N/D"}</div>
                  <div><strong>Scadenza assicurazione:</strong> {selectedRequest.insuranceExpiry ? formatDate(selectedRequest.insuranceExpiry) : "N/D"}</div>
                </div>
              </div>

              {/* Azioni */}
              {selectedRequest.onboardingStatus === "under_review" && (
                <div className="actions">
                  <button
                    className="btn btn-success"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    ✅ Approva
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                  >
                    ❌ Rifiuta
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <p>Seleziona una richiesta dalla lista per vedere i dettagli</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Rifiuto */}
      {showRejectModal && (
        <div className="modal-backdrop" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Rifiuta Richiesta</h3>
            <p>Inserisci il motivo del rifiuto:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Es: Documenti non leggibili, dati incompleti..."
              rows={4}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                Annulla
              </button>
              <button className="btn btn-danger" onClick={handleReject} disabled={actionLoading}>
                Conferma Rifiuto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingPage;
