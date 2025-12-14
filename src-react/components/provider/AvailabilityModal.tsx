import React, { useState, useEffect } from "react";
import AvailabilityManager, {
  ProviderAvailability,
  defaultWeeklySchedule,
} from "../AvailabilityManager";
import { Service } from "../../types";

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
  bookings: string[];
  onSave: (availability: ProviderAvailability) => Promise<void>;
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
  isOpen,
  onClose,
  service,
  bookings,
  onSave,
}) => {
  const [availabilityForm, setAvailabilityForm] =
    useState<ProviderAvailability | null>(null);

  useEffect(() => {
    if (service) {
      setAvailabilityForm(
        service.availability || {
          weekly: defaultWeeklySchedule,
          blockedDates: [],
        }
      );
    }
  }, [service, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (availabilityForm) {
      await onSave(availabilityForm);
    }
  };

  if (!isOpen || !service || !availabilityForm) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "800px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>Gestione Calendario: {service.title}</h2>
        <p style={{ color: "#666", marginBottom: "20px" }}>
          Visualizza le prenotazioni e gestisci i giorni di chiusura.
        </p>

        <form onSubmit={handleSubmit}>
          <AvailabilityManager
            value={availabilityForm}
            onChange={(newAvailability) => setAvailabilityForm(newAvailability)}
            bookedDates={bookings}
          />

          <div className="button-group" style={{ marginTop: "20px" }}>
            <button type="submit" className="btn btn-primary">
              Salva Disponibilità
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Chiudi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AvailabilityModal;
