import React, { useState, useEffect } from "react";
import AddressAutocomplete from "../AddressAutocomplete";
import AvailabilityManager, {
  ProviderAvailability,
  defaultWeeklySchedule,
} from "../AvailabilityManager";
import { CATEGORIES, AVAILABLE_PRODUCTS } from "../../constants/provider";
import { Service, ExtraService } from "../../types";

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
    priceType: "hourly", // Sempre orario
    productsUsed: [] as string[],
    address: "",
    latitude: 0,
    longitude: 0,
    workingHoursStart: "08:00",
    workingHoursEnd: "18:00",
    slotDurationMinutes: 30,
    coverageRadiusKm: 20,
    availability: {
      weekly: defaultWeeklySchedule,
      blockedDates: [],
    } as ProviderAvailability,
    extraServices: [] as ExtraService[],
  });
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Stato per nuovo servizio extra
  const [newExtraName, setNewExtraName] = useState("");
  const [newExtraPrice, setNewExtraPrice] = useState("");

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

      // Parse extra services
      let extraServices: ExtraService[] = [];
      if ((initialData as any).extraServices) {
        try {
          extraServices =
            typeof (initialData as any).extraServices === "string"
              ? JSON.parse((initialData as any).extraServices)
              : (initialData as any).extraServices;
        } catch (e) {
          extraServices = [];
        }
      }

      setFormData({
        title: initialData.title,
        description: initialData.description,
        category: initialData.category || "Altro",
        price: initialData.price.toString(),
        priceType: "hourly", // Sempre orario
        productsUsed: initialData.productsUsed || [],
        address: initialData.address || "",
        latitude: initialData.latitude || 0,
        longitude: initialData.longitude || 0,
        workingHoursStart: (initialData as any).workingHoursStart || "08:00",
        workingHoursEnd: (initialData as any).workingHoursEnd || "18:00",
        slotDurationMinutes: (initialData as any).slotDurationMinutes || 30,
        coverageRadiusKm: (initialData as any).coverageRadiusKm || 20,
        availability: availability,
        extraServices: extraServices,
      });
    } else {
      // Reset for create mode
      setFormData({
        title: "",
        description: "",
        category: "Altro",
        price: "",
        priceType: "hourly",
        productsUsed: [],
        address: "",
        latitude: 0,
        longitude: 0,
        workingHoursStart: "08:00",
        workingHoursEnd: "18:00",
        slotDurationMinutes: 30,
        coverageRadiusKm: 20,
        availability: {
          weekly: defaultWeeklySchedule,
          blockedDates: [],
        },
        extraServices: [],
      });
      setImage(null);
      setErrors({});
      setNewExtraName("");
      setNewExtraPrice("");
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
      data.append("priceType", formData.priceType);
      data.append("productsUsed", JSON.stringify(formData.productsUsed));
      data.append("extraServices", JSON.stringify(formData.extraServices));
      data.append("workingHoursStart", formData.workingHoursStart);
      data.append("workingHoursEnd", formData.workingHoursEnd);
      data.append(
        "slotDurationMinutes",
        formData.slotDurationMinutes.toString()
      );
      data.append("coverageRadiusKm", formData.coverageRadiusKm.toString());

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

  // Funzioni per gestire i servizi extra
  const addExtraService = () => {
    if (newExtraName.trim() && newExtraPrice) {
      const price = parseFloat(newExtraPrice);
      if (price > 0) {
        setFormData({
          ...formData,
          extraServices: [
            ...formData.extraServices,
            { name: newExtraName.trim(), price },
          ],
        });
        setNewExtraName("");
        setNewExtraPrice("");
      }
    }
  };

  const removeExtraService = (index: number) => {
    setFormData({
      ...formData,
      extraServices: formData.extraServices.filter((_, i) => i !== index),
    });
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
            <label>Prezzo orario (€/ora) *</label>
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

          {/* Servizi Extra */}
          <div className="form-group">
            <label>Servizi Extra (Opzionale)</label>
            <p
              style={{
                fontSize: "0.85em",
                color: "#666",
                marginBottom: "12px",
              }}
            >
              Aggiungi servizi aggiuntivi che i clienti possono scegliere
              durante la prenotazione
            </p>

            {/* Lista servizi extra esistenti */}
            {formData.extraServices.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                {formData.extraServices.map((extra, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                      marginBottom: "8px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <span style={{ fontWeight: "500" }}>{extra.name}</span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span style={{ color: "#1a1a1a", fontWeight: "600" }}>
                        +€{extra.price.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExtraService(index)}
                        style={{
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "24px",
                          height: "24px",
                          cursor: "pointer",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Form per aggiungere nuovo servizio extra */}
            <div
              style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}
            >
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: "0.85em", color: "#666" }}>
                  Nome servizio
                </label>
                <input
                  type="text"
                  value={newExtraName}
                  onChange={(e) => setNewExtraName(e.target.value)}
                  placeholder="Es: Pulizia finestre, Stiratura..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.85em", color: "#666" }}>
                  Prezzo (€)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={newExtraPrice}
                  onChange={(e) => setNewExtraPrice(e.target.value)}
                  placeholder="10.00"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={addExtraService}
                disabled={!newExtraName.trim() || !newExtraPrice}
                style={{
                  padding: "10px 16px",
                  backgroundColor:
                    newExtraName.trim() && newExtraPrice ? "#28a745" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    newExtraName.trim() && newExtraPrice
                      ? "pointer"
                      : "not-allowed",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                }}
              >
                + Aggiungi
              </button>
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

          {/* Raggio di Copertura */}
          <div className="form-group">
            <label>Raggio di Copertura (km) *</label>
            <p
              style={{
                fontSize: "0.85em",
                color: "#666",
                marginBottom: "12px",
              }}
            >
              Indica la distanza massima che sei disposto a percorrere per
              raggiungere i clienti
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {[5, 10, 15, 20, 30, 50].map((radius) => (
                <label
                  key={radius}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 16px",
                    backgroundColor:
                      formData.coverageRadiusKm === radius
                        ? "#1a1a1a"
                        : "#f8f9fa",
                    color:
                      formData.coverageRadiusKm === radius ? "white" : "#333",
                    borderRadius: "8px",
                    border:
                      formData.coverageRadiusKm === radius
                        ? "2px solid #1a1a1a"
                        : "1px solid #ddd",
                    cursor: "pointer",
                    fontWeight:
                      formData.coverageRadiusKm === radius ? "600" : "400",
                    transition: "all 0.2s ease",
                    minWidth: "70px",
                  }}
                >
                  <input
                    type="radio"
                    name="coverageRadius"
                    value={radius}
                    checked={formData.coverageRadiusKm === radius}
                    onChange={() =>
                      setFormData({ ...formData, coverageRadiusKm: radius })
                    }
                    style={{ display: "none" }}
                  />
                  {radius} km
                </label>
              ))}
            </div>
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
