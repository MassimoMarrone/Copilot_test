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
    availability: {
      weekly: defaultWeeklySchedule,
      blockedDates: [],
    } as ProviderAvailability,
  });
  const [image, setImage] = useState<File | null>(null);

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
        availability: {
          weekly: defaultWeeklySchedule,
          blockedDates: [],
        },
      });
      setImage(null);
    }
  }, [initialData, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("category", formData.category);
    data.append("price", formData.price);
    data.append("productsUsed", JSON.stringify(formData.productsUsed));

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
            <label>Titolo</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              minLength={3}
              maxLength={200}
            />
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
            <label>Descrizione</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              required
              minLength={10}
              maxLength={2000}
            />
          </div>
          <div className="form-group">
            <label>Prezzo (€)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              required
            />
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
            <label>Indirizzo (Opzionale)</label>
            <AddressAutocomplete
              onSelect={(loc) => {
                setFormData({
                  ...formData,
                  address: loc.address,
                  latitude: loc.lat,
                  longitude: loc.lng,
                });
              }}
              initialValue={formData.address}
            />
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
            <button type="submit" className="btn btn-primary">
              {mode === "create" ? "Crea Servizio" : "Salva Modifiche"}
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

export default ServiceModal;
