import React, { useState, useEffect, useRef } from "react";
import "../styles/SearchBar.css";
import { locationService } from "../services/locationService";

interface SearchBarProps {
  onSearch: (
    query: string,
    location?: { lat: number; lng: number; address: string },
    priceRange?: { min: number; max: number },
    category?: string,
    products?: string[]
  ) => void;
  // googleMapsApiKey removed as we use OpenStreetMap
}

const CATEGORIES = [
  "Tutte",
  "Pulizia",
  "Giardinaggio",
  "Manutenzione",
  "Idraulica",
  "Elettricista",
  "Traslochi",
  "Altro",
];

const AVAILABLE_PRODUCTS = [
  "Prodotti Ecologici",
  "Prodotti Ipoallergenici",
  "Attrezzatura Professionale",
  "Prodotti Sanificanti",
  "Prodotti Pet-Friendly",
  "Prodotti Senza Profumo",
];

interface NominatimResult {
  place_id: string;
  lat: string;
  lon: string;
  display_name: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<NominatimResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tutte");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const locationWrapperRef = useRef<HTMLDivElement>(null);

  // Close filters and location results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
      }
      if (
        locationWrapperRef.current &&
        !locationWrapperRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle location input change with debounce
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationQuery(value);

    // Reset current location when user types to avoid mismatch
    if (locationEnabled) {
      setLocationEnabled(false);
      setCurrentLocation(null);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 3) {
      setLocationResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await locationService.searchAddress(value);
        if (Array.isArray(data)) {
          setLocationResults(data);
          setShowResults(true);
        } else {
          setLocationResults([]);
        }
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    }, 500); // 500ms debounce
  };

  const selectLocation = (result: NominatimResult) => {
    const location = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name,
    };
    setCurrentLocation(location);
    setLocationEnabled(true);
    setLocationQuery(result.display_name);
    setShowResults(false);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalizzazione non è supportata dal tuo browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const address = await locationService.reverseGeocode(
            latitude,
            longitude
          );

          const location = {
            lat: latitude,
            lng: longitude,
            address:
              address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          };

          setCurrentLocation(location);
          setLocationEnabled(true);
          setLocationQuery(location.address);
        } catch (error) {
          console.error("Error getting address:", error);
          // Fallback if reverse geocoding fails
          const location = {
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          };
          setCurrentLocation(location);
          setLocationEnabled(true);
          setLocationQuery(location.address);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Impossibile ottenere la posizione corrente");
      }
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const priceRange = {
      min: minPrice,
      max: maxPrice === 200 ? Infinity : maxPrice, // Treat max value as Infinity if it's at the limit
    };

    if (locationEnabled && currentLocation) {
      onSearch(
        searchQuery,
        currentLocation,
        priceRange,
        selectedCategory,
        selectedProducts
      );
    } else {
      onSearch(
        searchQuery,
        undefined,
        priceRange,
        selectedCategory,
        selectedProducts
      );
    }
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), maxPrice - 1);
    setMinPrice(value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), minPrice + 1);
    setMaxPrice(value);
  };

  const handleClearLocation = () => {
    setLocationEnabled(false);
    setCurrentLocation(null);
    setLocationQuery("");
    setShowResults(false);
  };

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-bar-wrapper">
          <div className="search-input-section">
            <div className="search-icon-label">
              <span className="icon">🔍</span>
              <label>Cosa cerchi?</label>
            </div>
            <input
              type="text"
              className="search-input-premium"
              placeholder="Pulizia, Idraulico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="search-divider"></div>

          <div className="location-input-section">
            <div className="search-icon-label">
              <span className="icon">📍</span>
              <label>Dove?</label>
            </div>
            <div className="location-input-container" ref={locationWrapperRef}>
              <input
                type="text"
                className="location-input-premium"
                placeholder="Indirizzo o città"
                value={locationQuery}
                onChange={handleLocationChange}
                onFocus={() => setShowResults(true)}
              />
              {locationEnabled && currentLocation && (
                <button
                  type="button"
                  className="clear-location-btn-premium"
                  onClick={handleClearLocation}
                >
                  ✕
                </button>
              )}
              
              {showResults && (
                <ul className="location-results-dropdown premium-dropdown">
                  <li
                    className="location-result-item current-location-item"
                    onClick={() => {
                      handleGetCurrentLocation();
                      setShowResults(false);
                    }}
                  >
                    <span className="icon">📍</span> Usa la mia posizione attuale
                  </li>
                  {locationResults.map((result) => (
                    <li
                      key={result.place_id}
                      onClick={() => selectLocation(result)}
                      className="location-result-item"
                    >
                      <span className="icon">🏙️</span> {result.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="search-actions-section">
            <button
              type="button"
              className={`filter-btn-premium ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
              title="Filtri"
            >
              <span className="icon">⚙️</span>
            </button>
            <button type="submit" className="search-btn-premium">
              <span className="icon">🔍</span>
              <span className="text">Cerca</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filters-dropdown" ref={filterRef}>
            <div className="filter-section">
              <label className="filter-label">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-section">
              <label className="filter-label">Prodotti Utilizzati</label>
              <div
                className="products-filter-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {AVAILABLE_PRODUCTS.map((product) => (
                  <label
                    key={product}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product]);
                        } else {
                          setSelectedProducts(
                            selectedProducts.filter((p) => p !== product)
                          );
                        }
                      }}
                    />
                    {product}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <label className="filter-label">
                Prezzo: €{minPrice} - €{maxPrice}
                {maxPrice === 200 ? "+" : ""}
              </label>
              <div className="range-slider-container">
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={minPrice}
                  onChange={handleMinChange}
                  className="thumb thumb-left"
                />
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={maxPrice}
                  onChange={handleMaxChange}
                  className="thumb thumb-right"
                />
                <div className="slider-track"></div>
                <div
                  className="slider-range"
                  style={{
                    left: `${(minPrice / 200) * 100}%`,
                    right: `${100 - (maxPrice / 200) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
