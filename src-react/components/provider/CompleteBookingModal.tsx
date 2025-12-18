import React, { useState } from "react";

interface CompleteBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (photos: File[]) => Promise<void>;
}

const CompleteBookingModal: React.FC<CompleteBookingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [photoProofs, setPhotoProofs] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalFiles = [...photoProofs, ...newFiles];

      if (totalFiles.length > 10) {
        alert("Puoi caricare massimo 10 foto");
        return;
      }

      setPhotoProofs(totalFiles);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoProofs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photoProofs.length === 0) {
      alert("Devi caricare almeno 1 foto come prova del servizio completato");
      return;
    }
    if (photoProofs.length > 10) {
      alert("Puoi caricare massimo 10 foto");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(photoProofs);
      setPhotoProofs([]); // Reset after submit
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setPhotoProofs([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          &times;
        </button>
        <h2>📸 Completa Servizio</h2>
        <p>
          Carica <strong>da 1 a 10 foto</strong> come prova del lavoro
          completato.
        </p>
        <div
          className="escrow-info"
          style={{
            background: "#fff3cd",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          <strong>💰 Sistema Escrow:</strong> Il cliente avrà 24 ore per
          confermare il servizio. Dopo la conferma (o automaticamente dopo 24h),
          il pagamento verrà trasferito sul tuo account.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Foto Prova ({photoProofs.length}/10)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={isSubmitting || photoProofs.length >= 10}
            />
            <small
              style={{ color: "#666", display: "block", marginTop: "4px" }}
            >
              Seleziona più foto contemporaneamente o aggiungile una alla volta
            </small>
          </div>

          {/* Preview delle foto selezionate */}
          {photoProofs.length > 0 && (
            <div
              className="photo-previews"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              {photoProofs.map((file, index) => (
                <div key={index} style={{ position: "relative" }}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Foto ${index + 1}`}
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    disabled={isSubmitting}
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-8px",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      cursor: "pointer",
                      fontSize: "12px",
                      lineHeight: "1",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="button-group">
            <button
              type="submit"
              className="btn btn-success"
              disabled={isSubmitting || photoProofs.length === 0}
            >
              {isSubmitting
                ? "Invio in corso..."
                : `Conferma Completamento (${photoProofs.length} foto)`}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteBookingModal;
