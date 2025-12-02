import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import ServiceReviewsModal from "../components/ServiceReviewsModal";
import SearchBar from "../components/SearchBar";
import ServiceMap from "../components/ServiceMap";
import ServiceCardSkeleton from "../components/ServiceCardSkeleton";
import ServiceCard from "../components/ServiceCard";
import SmartBookingForm, {
  SmartBookingData,
} from "../components/SmartBookingForm";
import {
  servicesService,
  Service,
  SearchFilters,
} from "../services/servicesService";
import { bookingService } from "../services/bookingService";
import "../styles/ServicesPage.css";
import "../styles/Skeleton.css";

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface ProviderAvailability {
  weekly: WeeklySchedule;
  blockedDates: string[];
}

// Service interface is imported from servicesService

const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [isFiltered, setIsFiltered] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Reviews modal state
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewsService, setReviewsService] = useState<Service | null>(null);

  // Initial load
  useEffect(() => {
    loadServices(1, true);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (isFiltered || viewMode === "map") return; // Disable infinite scroll when filtered or in map mode

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreServices();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loading, isFiltered, viewMode]);

  const loadServices = async (pageNum: number, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      }
      const result = await servicesService.getAllServices(pageNum, 12);

      if (reset) {
        setServices(result.services);
        setFilteredServices(result.services);
      } else {
        setServices((prev) => [...prev, ...result.services]);
        setFilteredServices((prev) => [...prev, ...result.services]);
      }

      setPage(pageNum);
      setHasMore(result.pagination.hasMore);
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreServices = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadServices(page + 1, false);
    }
  }, [page, loadingMore, hasMore]);

  // Server-side search with filters
  const handleSearch = async (
    query: string,
    location?: { lat: number; lng: number; address: string },
    priceRange?: { min: number; max: number },
    category?: string,
    products?: string[]
  ) => {
    // Check if any filter is active
    const hasActiveFilters = Boolean(
      query.trim() !== "" ||
        (category && category !== "Tutte") ||
        (products && products.length > 0) ||
        (location && location.lat && location.lng) ||
        (priceRange && (priceRange.min > 0 || priceRange.max < Infinity))
    );

    if (!hasActiveFilters) {
      // No filters - reset to normal paginated view
      setIsFiltered(false);
      setFilteredServices(services);
      return;
    }

    // Build filters object for server-side search
    const filters: SearchFilters = {};

    if (query.trim()) {
      filters.query = query.trim();
    }

    if (category && category !== "Tutte") {
      filters.category = category;
    }

    if (products && products.length > 0) {
      filters.products = products;
    }

    if (location && location.lat && location.lng) {
      filters.latitude = location.lat;
      filters.longitude = location.lng;
    }

    if (priceRange) {
      if (priceRange.min > 0) {
        filters.minPrice = priceRange.min;
      }
      if (priceRange.max < Infinity) {
        filters.maxPrice = priceRange.max;
      }
    }

    try {
      setLoading(true);
      const result = await servicesService.getAllServices(1, 100, filters); // Load more results for search
      setFilteredServices(result.services);
      setIsFiltered(true);
    } catch (error) {
      console.error("Error searching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setIsFiltered(false);
    setFilteredServices(services);
  };

  const openBookingModal = (service: Service) => {
    setSelectedService(service);
    setShowBookingModal(true);
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedService(null);
  };

  const openReviewsModal = (service: Service) => {
    setReviewsService(service);
    setShowReviewsModal(true);
  };

  const closeReviewsModal = () => {
    setShowReviewsModal(false);
    setReviewsService(null);
  };

  // Handle smart booking submission
  const handleSmartBooking = async (bookingData: SmartBookingData) => {
    if (!selectedService || !user) return;

    try {
      const { url } = await bookingService.createBooking({
        serviceId: selectedService.id,
        date: bookingData.date,
        clientPhone: bookingData.clientPhone,
        preferredTime: bookingData.startTime,
        notes: bookingData.notes || "",
        address: bookingData.address,
        squareMetersRange: bookingData.squareMetersRange,
        windowsCount: bookingData.windowsCount,
        estimatedDuration: bookingData.estimatedDuration,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        selectedExtras: bookingData.selectedExtras,
      });

      window.location.href = url;
    } catch (error: any) {
      alert(error.message || "Errore nella prenotazione");
    }
  };

  return (
    <div className="services-page">
      <div className="page-header">
        <h1>Esplora Servizi</h1>
        <p>Trova il professionista giusto per le tue esigenze</p>
      </div>

      <SearchBar onSearch={handleSearch} />

      <div className="view-toggle-container">
        <button
          className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
          onClick={() => setViewMode("list")}
        >
          📋 Lista
        </button>
        <button
          className={`view-toggle-btn ${viewMode === "map" ? "active" : ""}`}
          onClick={() => setViewMode("map")}
        >
          🗺️ Mappa
        </button>
      </div>

      {loading ? (
        <div className="services-grid">
          {[...Array(6)].map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      ) : viewMode === "map" ? (
        <ServiceMap services={filteredServices} onBook={openBookingModal} />
      ) : (
        <>
          <div className="services-grid">
            {filteredServices.length === 0 ? (
              <div className="empty-state">
                Nessun servizio disponibile al momento.
              </div>
            ) : (
              filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onBook={openBookingModal}
                  onReview={openReviewsModal}
                />
              ))
            )}

            {/* Loading more skeletons */}
            {loadingMore && (
              <>
                {[...Array(3)].map((_, i) => (
                  <ServiceCardSkeleton key={`loading-${i}`} />
                ))}
              </>
            )}
          </div>

          {/* Infinite scroll trigger */}
          {!isFiltered && hasMore && !loadingMore && (
            <div
              ref={loadMoreRef}
              style={{ height: "20px", margin: "20px 0" }}
            />
          )}

          {/* End of results */}
          {!hasMore && filteredServices.length > 0 && (
            <div className="end-of-results">
              ✨ Hai visto tutti i {filteredServices.length} servizi disponibili
            </div>
          )}
        </>
      )}

      {/* Booking Modal with Smart Booking Form */}
      {showBookingModal && selectedService && (
        <div className="modal-overlay" onClick={closeBookingModal}>
          <div
            className="modal-content smart-booking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeBookingModal}>
              &times;
            </button>
            <SmartBookingForm
              service={selectedService}
              onSubmit={handleSmartBooking}
              onCancel={closeBookingModal}
            />
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsModal && reviewsService && (
        <ServiceReviewsModal
          serviceId={reviewsService.id}
          serviceTitle={reviewsService.title}
          onClose={closeReviewsModal}
        />
      )}
    </div>
  );
};

export default ServicesPage;
