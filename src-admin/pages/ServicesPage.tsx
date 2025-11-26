import React, { useState, useEffect } from "react";
import { adminApi, AdminService } from "../services/adminApi";

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await adminApi.getServices();
      setServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (service: AdminService) => {
    if (!window.confirm(`Vuoi eliminare il servizio "${service.title}"?`))
      return;

    try {
      await adminApi.deleteService(service.id);
      setServices(services.filter((s) => s.id !== service.id));
    } catch (error) {
      alert("Errore durante l'eliminazione");
    }
  };

  const handleToggleActive = async (service: AdminService) => {
    try {
      await adminApi.toggleServiceActive(service.id, service.isActive);
      setServices(
        services.map((s) =>
          s.id === service.id ? { ...s, isActive: !s.isActive } : s
        )
      );
    } catch (error) {
      alert("Errore durante l'operazione");
    }
  };

  const categories = [
    "all",
    ...new Set(services.map((s) => s.category || "Altro").filter(Boolean)),
  ];

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.title.toLowerCase().includes(search.toLowerCase()) ||
      service.providerEmail.toLowerCase().includes(search.toLowerCase()) ||
      (service.address?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || service.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Caricamento servizi...</p>
      </div>
    );
  }

  return (
    <div className="services-page">
      <div className="page-header">
        <h1>🛠️ Gestione Servizi</h1>
        <p>{services.length} servizi pubblicati</p>
      </div>

      <div className="page-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Cerca servizi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        <select
          className="category-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Tutte le categorie</option>
          {categories
            .filter((c) => c !== "all")
            .map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
        </select>
      </div>

      <div className="services-grid">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className={`service-card ${!service.isActive ? "inactive" : ""}`}
          >
            <div className="service-header">
              <h3>{service.title}</h3>
              <span
                className={`price-badge ${
                  service.isActive ? "active" : "inactive"
                }`}
              >
                €{service.price}/ora
              </span>
            </div>

            <p className="service-description">{service.description}</p>

            <div className="service-meta">
              {service.category && (
                <span className="meta-item">📁 {service.category}</span>
              )}
              {service.address && (
                <span className="meta-item">📍 {service.address}</span>
              )}
              <span className="meta-item">👤 {service.providerEmail}</span>
              <span className="meta-item">
                📅 {new Date(service.createdAt).toLocaleDateString("it-IT")}
              </span>
              <span className="meta-item">
                📊 {service.bookingsCount || 0} prenotazioni
              </span>
            </div>

            <div className="service-status">
              {service.isActive ? (
                <span className="status active">✅ Attivo</span>
              ) : (
                <span className="status inactive">⏸️ Disattivato</span>
              )}
            </div>

            <div className="service-actions">
              <button
                className={`action-btn ${
                  service.isActive ? "deactivate" : "activate"
                }`}
                onClick={() => handleToggleActive(service)}
              >
                {service.isActive ? "⏸️ Disattiva" : "▶️ Attiva"}
              </button>
              <button
                className="action-btn delete"
                onClick={() => handleDelete(service)}
              >
                🗑️ Elimina
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="no-results">
          <p>Nessun servizio trovato</p>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
