import React from "react";
import { Service } from "../../types/provider";
import { defaultWeeklySchedule } from "../AvailabilityManager";

interface ServiceListProps {
  services: Service[];
  onEdit: (service: Service) => void;
  onCalendar: (service: Service) => void;
  onDelete: (service: Service) => void;
}

const ServiceList: React.FC<ServiceListProps> = ({
  services,
  onEdit,
  onCalendar,
  onDelete,
}) => {
  if (services.length === 0) {
    return (
      <div className="empty-state">
        <p>
          Non hai ancora creato servizi. Clicca sul pulsante sopra per
          aggiungerne uno.
        </p>
      </div>
    );
  }

  return (
    <div className="services-grid">
      {services.map((service) => (
        <div key={service.id} className="service-card">
          {service.imageUrl && (
            <img
              src={service.imageUrl}
              alt={service.title}
              className="service-image"
              style={{
                width: "100%",
                height: "150px",
                objectFit: "cover",
                borderRadius: "8px 8px 0 0",
                marginBottom: "10px",
              }}
            />
          )}
          <h3>{service.title}</h3>
          <p className="service-description">{service.description}</p>
          {service.address && (
            <p className="service-location">📍 {service.address}</p>
          )}
          <p className="service-price">€{service.price.toFixed(2)}</p>
          <p>
            <small>
              Creato il:{" "}
              {new Date(service.createdAt).toLocaleDateString("it-IT")}
            </small>
          </p>
          <div
            className="service-actions"
            style={{ display: "flex", gap: "10px", marginTop: "10px" }}
          >
            <button
              className="btn-calendar"
              onClick={() => onCalendar(service)}
              style={{
                flex: 1,
                backgroundColor: "#6f42c1",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              📅 Calendario
            </button>
            <button
              className="btn-edit-service"
              onClick={() => onEdit(service)}
              style={{
                flex: 1,
                backgroundColor: "#ffc107",
                color: "#000",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ✏️ Modifica
            </button>
            <button
              className="btn-delete-service"
              onClick={() => onDelete(service)}
              style={{
                flex: 1,
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              🗑️ Elimina
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServiceList;
