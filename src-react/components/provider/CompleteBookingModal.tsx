import React, { useState } from "react";

interface CompleteBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (photo: File) => Promise<void>;
}

const CompleteBookingModal: React.FC<CompleteBookingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [photoProof, setPhotoProof] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoProof) {
      alert("Devi caricare una foto prova del servizio completato");
      return;
    }
    await onConfirm(photoProof);
    setPhotoProof(null); // Reset after submit
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>Completa Servizio</h2>
        <p>
          Carica una foto come prova del lavoro completato per sbloccare il
          pagamento.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Foto Prova</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setPhotoProof(e.target.files[0]);
                }
              }}
              required
            />
          </div>
          <div className="button-group">
            <button type="submit" className="btn btn-success">
              Conferma Completamento
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
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
