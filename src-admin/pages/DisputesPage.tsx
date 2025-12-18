import React, { useState, useEffect } from "react";
import {
  adminApi,
  AdminDispute,
  AdminDisputeDetails,
} from "../services/adminApi";

const DisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedDispute, setSelectedDispute] =
    useState<AdminDisputeDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, [statusFilter]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getDisputes(statusFilter);
      setDisputes(data);
    } catch (error) {
      console.error("Error loading disputes:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDisputeDetails = async (disputeId: string) => {
    try {
      const details = await adminApi.getDisputeDetails(disputeId);
      setSelectedDispute(details);
      setShowModal(true);
      setResolveNotes("");
    } catch (error) {
      console.error("Error loading dispute details:", error);
      alert("Errore nel caricamento dei dettagli");
    }
  };

  const handleResolve = async (resolution: "refund" | "release") => {
    if (!selectedDispute) return;

    if (!resolveNotes || resolveNotes.trim().length < 5) {
      alert("Inserisci una motivazione di almeno 5 caratteri");
      return;
    }

    const confirmMsg =
      resolution === "refund"
        ? `Confermi il RIMBORSO al cliente?\n\nImporto: €${selectedDispute.amount.toFixed(
            2
          )}\nMotivazione: ${resolveNotes}`
        : `Confermi il PAGAMENTO al provider?\n\nImporto: €${selectedDispute.amount.toFixed(
            2
          )}\nMotivazione: ${resolveNotes}`;

    if (!window.confirm(confirmMsg)) return;

    setResolving(true);
    try {
      await adminApi.resolveDispute(
        selectedDispute.id,
        resolution,
        resolveNotes
      );
      alert(
        `Controversia risolta con successo! (${
          resolution === "refund" ? "Rimborso" : "Pagamento rilasciato"
        })`
      );
      setShowModal(false);
      setSelectedDispute(null);
      loadDisputes();
    } catch (error: any) {
      alert(error.response?.data?.error || "Errore nella risoluzione");
    } finally {
      setResolving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="badge badge-warning">⏳ In attesa</span>;
      case "resolved_refund":
        return <span className="badge badge-info">↩️ Rimborsato</span>;
      case "resolved_payment":
        return <span className="badge badge-success">✅ Pagato</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Caricamento controversie...</p>
      </div>
    );
  }

  return (
    <div className="disputes-page">
      <div className="page-header">
        <h1>⚠️ Gestione Controversie</h1>
        <p>
          {disputes.length} controversie{" "}
          {statusFilter === "pending" ? "in attesa" : ""}
        </p>
      </div>

      <div className="page-toolbar">
        <div className="filter-tabs">
          {[
            {
              key: "pending",
              label: "⏳ In Attesa",
              count: disputes.filter((d) => d.disputeStatus === "pending")
                .length,
            },
            { key: "resolved_refund", label: "↩️ Rimborsate" },
            { key: "resolved_payment", label: "✅ Pagate" },
            { key: "all", label: "Tutte" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab ${
                statusFilter === tab.key ? "active" : ""
              }`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {disputes.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✅</span>
          <h3>
            Nessuna controversia {statusFilter === "pending" ? "in attesa" : ""}
          </h3>
          <p>Non ci sono controversie da gestire al momento.</p>
        </div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Servizio</th>
                <th>Cliente</th>
                <th>Provider</th>
                <th>Importo</th>
                <th>Motivo</th>
                <th>Aperta il</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => (
                <tr key={dispute.id}>
                  <td>
                    <strong>{dispute.serviceTitle}</strong>
                    <br />
                    <small className="text-muted">
                      {dispute.serviceCategory || "Servizio"}
                    </small>
                  </td>
                  <td>
                    <span>{dispute.clientName}</span>
                    <br />
                    <small className="text-muted">{dispute.clientEmail}</small>
                  </td>
                  <td>
                    <span>{dispute.providerName}</span>
                    <br />
                    <small className="text-muted">
                      {dispute.providerEmail}
                    </small>
                  </td>
                  <td>
                    <strong>€{dispute.amount.toFixed(2)}</strong>
                  </td>
                  <td>
                    <div
                      className="dispute-reason"
                      title={dispute.disputeReason}
                    >
                      {dispute.disputeReason.length > 50
                        ? dispute.disputeReason.substring(0, 50) + "..."
                        : dispute.disputeReason}
                    </div>
                  </td>
                  <td>{formatDate(dispute.disputeOpenedAt)}</td>
                  <td>{getStatusBadge(dispute.disputeStatus)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => openDisputeDetails(dispute.id)}
                    >
                      👁️ Dettagli
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dispute Details Modal */}
      {showModal && selectedDispute && (
        <div
          className="modal-overlay"
          onClick={() => !resolving && setShowModal(false)}
        >
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => !resolving && setShowModal(false)}
              disabled={resolving}
            >
              &times;
            </button>

            <h2>⚠️ Dettagli Controversia</h2>

            <div className="dispute-details">
              {/* Booking Info */}
              <div className="detail-section">
                <h3>📋 Informazioni Prenotazione</h3>
                <div className="detail-grid">
                  <div>
                    <label>Servizio:</label>
                    <span>{selectedDispute.serviceTitle}</span>
                  </div>
                  <div>
                    <label>Data Servizio:</label>
                    <span>{formatDate(selectedDispute.date)}</span>
                  </div>
                  <div>
                    <label>Importo:</label>
                    <span className="amount">
                      €{selectedDispute.amount.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <label>Stato Pagamento:</label>
                    <span>{selectedDispute.paymentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="detail-section">
                <h3>👤 Cliente</h3>
                <div className="detail-grid">
                  <div>
                    <label>Nome:</label>
                    <span>{selectedDispute.clientName}</span>
                  </div>
                  <div>
                    <label>Email:</label>
                    <span>{selectedDispute.client.email}</span>
                  </div>
                  {selectedDispute.client.phone && (
                    <div>
                      <label>Telefono:</label>
                      <span>{selectedDispute.client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Provider Info */}
              <div className="detail-section">
                <h3>🔧 Provider</h3>
                <div className="detail-grid">
                  <div>
                    <label>Nome:</label>
                    <span>{selectedDispute.providerName}</span>
                  </div>
                  <div>
                    <label>Email:</label>
                    <span>{selectedDispute.provider.email}</span>
                  </div>
                  {selectedDispute.provider.phone && (
                    <div>
                      <label>Telefono:</label>
                      <span>{selectedDispute.provider.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dispute Info */}
              <div className="detail-section dispute-info">
                <h3>❗ Motivo Controversia</h3>
                <div className="dispute-reason-full">
                  {selectedDispute.disputeReason}
                </div>
                <small className="text-muted">
                  Aperta il {formatDate(selectedDispute.disputeOpenedAt)}
                </small>
              </div>

              {/* Photo Proofs */}
              {selectedDispute.photoProofs &&
                selectedDispute.photoProofs.length > 0 && (
                  <div className="detail-section">
                    <h3>
                      📸 Foto Prova del Provider (
                      {selectedDispute.photoProofs.length})
                    </h3>
                    <div className="photo-grid">
                      {selectedDispute.photoProofs.map((photo, index) => (
                        <a
                          key={index}
                          href={photo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="photo-thumb"
                        >
                          <img src={photo} alt={`Foto ${index + 1}`} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              {/* Chat History */}
              {selectedDispute.messages &&
                selectedDispute.messages.length > 0 && (
                  <div className="detail-section">
                    <h3>
                      💬 Storico Chat ({selectedDispute.messages.length}{" "}
                      messaggi)
                    </h3>
                    <div className="chat-history">
                      {selectedDispute.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`chat-message ${
                            msg.senderType === "client" ? "client" : "provider"
                          }`}
                        >
                          <div className="message-header">
                            <strong>
                              {msg.senderType === "client"
                                ? "Cliente"
                                : "Provider"}
                            </strong>
                            <small>{formatDate(msg.createdAt)}</small>
                          </div>
                          <p>{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Resolution Section (only for pending) */}
              {selectedDispute.disputeStatus === "pending" && (
                <div className="detail-section resolution-section">
                  <h3>⚖️ Risoluzione</h3>
                  <div className="form-group">
                    <label>Motivazione della decisione *</label>
                    <textarea
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      placeholder="Descrivi il motivo della tua decisione..."
                      rows={3}
                      disabled={resolving}
                    />
                  </div>
                  <div className="resolution-buttons">
                    <button
                      className="btn btn-danger btn-lg"
                      onClick={() => handleResolve("refund")}
                      disabled={resolving}
                    >
                      ↩️ Rimborsa Cliente (€{selectedDispute.amount.toFixed(2)})
                    </button>
                    <button
                      className="btn btn-success btn-lg"
                      onClick={() => handleResolve("release")}
                      disabled={resolving}
                    >
                      💰 Paga Provider (€{selectedDispute.amount.toFixed(2)})
                    </button>
                  </div>
                </div>
              )}

              {/* Already Resolved */}
              {selectedDispute.disputeStatus !== "pending" && (
                <div className="detail-section resolved-info">
                  <h3>✅ Già Risolta</h3>
                  <p>
                    <strong>Esito:</strong>{" "}
                    {selectedDispute.disputeStatus === "resolved_refund"
                      ? "Rimborsato al cliente"
                      : "Pagato al provider"}
                  </p>
                  {selectedDispute.disputeNotes && (
                    <p>
                      <strong>Note:</strong> {selectedDispute.disputeNotes}
                    </p>
                  )}
                  {selectedDispute.disputeResolvedAt && (
                    <p>
                      <strong>Data:</strong>{" "}
                      {formatDate(selectedDispute.disputeResolvedAt)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .disputes-page .dispute-reason {
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .disputes-page .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .disputes-page .empty-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }

        .modal-large {
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .dispute-details {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .detail-section {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
        }

        .detail-section h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #333;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .detail-grid label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 2px;
        }

        .detail-grid span {
          font-weight: 500;
        }

        .amount {
          font-size: 18px;
          color: #27ae60;
        }

        .dispute-info {
          background: #fff3cd;
          border: 1px solid #ffc107;
        }

        .dispute-reason-full {
          background: white;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 8px;
          white-space: pre-wrap;
        }

        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 8px;
        }

        .photo-thumb {
          display: block;
        }

        .photo-thumb img {
          width: 100%;
          height: 100px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid #ddd;
          transition: transform 0.2s;
        }

        .photo-thumb img:hover {
          transform: scale(1.05);
        }

        .chat-history {
          max-height: 300px;
          overflow-y: auto;
          background: white;
          border-radius: 4px;
          padding: 8px;
        }

        .chat-message {
          padding: 8px 12px;
          margin-bottom: 8px;
          border-radius: 8px;
        }

        .chat-message.client {
          background: #e3f2fd;
          margin-right: 20%;
        }

        .chat-message.provider {
          background: #e8f5e9;
          margin-left: 20%;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .chat-message p {
          margin: 0;
          font-size: 14px;
        }

        .resolution-section {
          background: #e8f4fd;
          border: 2px solid #3498db;
        }

        .resolution-section textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          resize: vertical;
        }

        .resolution-buttons {
          display: flex;
          gap: 16px;
          margin-top: 16px;
        }

        .resolution-buttons .btn {
          flex: 1;
          padding: 16px;
          font-size: 16px;
        }

        .resolved-info {
          background: #d4edda;
          border: 1px solid #28a745;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .badge-warning {
          background: #fff3cd;
          color: #856404;
        }

        .badge-success {
          background: #d4edda;
          color: #155724;
        }

        .badge-info {
          background: #d1ecf1;
          color: #0c5460;
        }

        .btn-lg {
          padding: 12px 24px;
          font-size: 16px;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
          border: none;
        }

        .btn-danger:hover {
          background: #c82333;
        }
      `}</style>
    </div>
  );
};

export default DisputesPage;
