import React, { useState, useEffect } from "react";
import AddressAutocomplete from "../AddressAutocomplete";
import AvailabilityManager, {
  ProviderAvailability,
  defaultWeeklySchedule,
} from "../AvailabilityManager";
import { CATEGORIES, AVAILABLE_PRODUCTS } from "../../constants/provider";
import { Service } from "../../types/provider";

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: Service | null;
  bookings?: string[]; // Dates of bookings for availability manager
  mode: "create" | "edit";
}

const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  bookings = [],
  mode,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Altro",
    price: "",
    productsUsed: [] as string[],
    address: "",
    latitude: 0,
    longitude: 0,
    workingHoursStart: "08:00",
    workingHoursEnd: "18:00",
    slotDurationMinutes: 60,
    availability: {
      weekly: defaultWeeklySchedule,
      blockedDates: [],
    } as ProviderAvailability,
  });
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData && mode === "edit") {
      // Ensure availability has a valid structure
      const availability = initialData.availability || {
        weekly: defaultWeeklySchedule,
        blockedDates: [],
      };

      // If weekly is missing (e.g. old data), add default
      if (!availability.weekly) {
        availability.weekly = defaultWeeklySchedule;
      }
      // If blockedDates is missing
      if (!availability.blockedDates) {
        availability.blockedDates = [];
      }

      setFormData({
        title: initialData.title,
        description: initialData.description,
        category: initialData.category || "Altro",
        price: initialData.price.toString(),
        productsUsed: initialData.productsUsed || [],
        address: initialData.address || "",
        latitude: initialData.latitude || 0,
        longitude: initialData.longitude || 0,
        workingHoursStart: (initialData as any).workingHoursStart || "08:00",
        workingHoursEnd: (initialData as any).workingHoursEnd || "18:00",
        slotDurationMinutes: (initialData as any).slotDurationMinutes || 60,
        availability: availability,
      });
    } else {
      // Reset for create mode
      setFormData({
        title: "",
        description: "",
        category: "Altro",
        price: "",
        productsUsed: [],
        address: "",
        latitude: 0,
        longitude: 0,
        workingHoursStart: "08:00",
        workingHoursEnd: "18:00",
        slotDurationMinutes: 60,
        availability: {
          weekly: defaultWeeklySchedule,
          blockedDates: [],
        },
      });
      setImage(null);
      setErrors({});
    }
  }, [initialData, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.title.trim().length < 3) {
      newErrors.title = "Il titolo deve avere almeno 3 caratteri";
    } else if (formData.title.trim().length > 200) {
      newErrors.title = "Il titolo non può superare 200 caratteri";
    }

    if (formData.description.trim().length < 10) {
      newErrors.description = "La descrizione deve avere almeno 10 caratteri";
    } else if (formData.description.trim().length > 2000) {
      newErrors.description = "La descrizione non può superare 2000 caratteri";
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0.5) {
      newErrors.price = "Il prezzo deve essere almeno €0.50";
    }

    if (formData.workingHoursStart >= formData.workingHoursEnd) {
      newErrors.workingHours =
        "L'orario di fine deve essere dopo l'orario di inizio";
    }

    if (!formData.address || formData.address.trim().length < 5) {
      newErrors.address = "L'indirizzo è obbligatorio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("description", formData.description.trim());
      data.append("category", formData.category);
      data.append("price", formData.price);
      data.append("productsUsed", JSON.stringify(formData.productsUsed));
      data.append("workingHoursStart", formData.workingHoursStart);
      data.append("workingHoursEnd", formData.workingHoursEnd);
      data.append(
        "slotDurationMinutes",
        formData.slotDurationMinutes.toString()
      );

      if (mode === "edit") {
        data.append("availability", JSON.stringify(formData.availability));
      }

      if (formData.address) {
        data.append("address", formData.address);
        if (formData.latitude && formData.longitude) {
          data.append("latitude", formData.latitude.toString());
          data.append("longitude", formData.longitude.toString());
        }
      }

      if (image) {
        data.append("image", image);
      }

      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={
          mode === "edit"
            ? {
                maxWidth: "800px",
                width: "90%",
                maxHeight: "90vh",
                overflowY: "auto",
              }
            : {}
        }
      >
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>
          {mode === "create" ? "Crea Nuovo Servizio" : "Modifica Servizio"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Titolo *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: "" });
              }}
              required
              minLength={3}
              maxLength={200}
              className={errors.title ? "input-error" : ""}
            />
            {errors.title && (
              <span className="error-message">{errors.title}</span>
            )}
          </div>
          <div className="form-group">
            <label>Categoria</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              required
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Descrizione *</label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  description: e.target.value,
                });
                if (errors.description)
                  setErrors({ ...errors, description: "" });
              }}
              required
              minLength={10}
              maxLength={2000}
              className={errors.description ? "input-error" : ""}
            />
            {errors.description && (
              <span className="error-message">{errors.description}</span>
            )}
          </div>
          <div className="form-group">
            <label>Prezzo orario (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0.50"
              value={formData.price}
              onChange={(e) => {
                setFormData({ ...formData, price: e.target.value });
                if (errors.price) setErrors({ ...errors, price: "" });
              }}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              required
              className={errors.price ? "input-error" : ""}
            />
            {errors.price && (
              <span className="error-message">{errors.price}</span>
            )}
            <small style={{ color: "#666", fontSize: "0.85em" }}>
              Il prezzo verrà moltiplicato per la durata stimata del servizio
            </small>
          </div>

          {/* Working Hours Section */}
          <div className="form-group">
            <label>Orari di Lavoro</label>
            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              <div>
                <label style={{ fontSize: "0.85em", color: "#666" }}>
                  Dalle
                </label>
                <input
                  type="time"
                  value={formData.workingHoursStart}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      workingHoursStart: e.target.value,
                    })
                  }
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.85em", color: "#666" }}>
                  Alle
                </label>
                <input
                  type="time"
                  value={formData.workingHoursEnd}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      workingHoursEnd: e.target.value,
                    })
                  }
                  style={{
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
            </div>
            {errors.workingHours && (
              <span className="error-message">{errors.workingHours}</span>
            )}
          </div>

          <div className="form-group">
            <label>Durata minima slot (minuti)</label>
            <select
              value={formData.slotDurationMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slotDurationMinutes: parseInt(e.target.value),
                })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              <option value={30}>30 minuti</option>
              <option value={60}>1 ora</option>
              <option value={90}>1 ora e 30 minuti</option>
              <option value={120}>2 ore</option>
            </select>
          </div>

          <div className="form-group">
            <label>Prodotti Utilizzati</label>
            <div
              className="products-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              {AVAILABLE_PRODUCTS.map((product) => (
                <label
                  key={product}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.productsUsed.includes(product)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          productsUsed: [...formData.productsUsed, product],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          productsUsed: formData.productsUsed.filter(
                            (p) => p !== product
                          ),
                        });
                      }
                    }}
                  />
                  {product}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>
              {mode === "create"
                ? "Immagine Servizio (Opzionale)"
                : "Nuova Immagine (Opzionale)"}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImage(e.target.files[0]);
                }
              }}
            />
          </div>
          <div className="form-group">
            <label>Indirizzo *</label>
            <AddressAutocomplete
              onSelect={(loc) => {
                setFormData({
                  ...formData,
                  address: loc.address,
                  latitude: loc.lat,
                  longitude: loc.lng,
                });
                if (errors.address) setErrors({ ...errors, address: "" });
              }}
              initialValue={formData.address}
            />
            {errors.address && (
              <span className="error-message">{errors.address}</span>
            )}
          </div>

          {mode === "edit" && (
            <>
              <hr style={{ margin: "20px 0" }} />
              <AvailabilityManager
                value={formData.availability}
                onChange={(newAvailability) =>
                  setFormData({ ...formData, availability: newAvailability })
                }
                bookedDates={bookings}
              />
            </>
          )}

          <div className="button-group" style={{ marginTop: "20px" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner"
                    style={{
                      display: "inline-block",
                      width: "16px",
                      height: "16px",
                      border: "2px solid #fff",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      marginRight: "8px",
                      verticalAlign: "middle",
                    }}
                  ></span>
                  Salvataggio...
                </>
              ) : mode === "create" ? (
                "Crea Servizio"
              ) : (
                "Salva Modifiche"
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annulla
            </button>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .input-error {
              border-color: #dc3545 !important;
            }
            .error-message {
              color: #dc3545;
              font-size: 0.85em;
              margin-top: 4px;
              display: block;
            }
          `}</style>
        </form>
      </div>
    </div>
  );
};

export default ServiceModal;
