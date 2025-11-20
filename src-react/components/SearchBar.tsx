import React, { useState, useEffect, useRef } from "react";
import "../styles/SearchBar.css";

interface SearchBarProps {
  onSearch: (
    query: string,
    location?: { lat: number; lng: number; address: string }
  ) => void;
  // googleMapsApiKey removed as we use OpenStreetMap
}

interface NominatimResult {
  place_id: number;
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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle location input change with debounce
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationQuery(value);

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
        const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
        const response = await fetch(
          `https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(
            value
          )}&format=json&countrycodes=it&limit=5`
        );
        const data = await response.json();
        // LocationIQ returns array on success, object with error on failure
        if (Array.isArray(data)) {
          setLocationResults(data);
          setShowResults(true);
        } else {
          console.error("LocationIQ Error:", data);
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
          // Reverse geocode using LocationIQ
          const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
          const response = await fetch(
            `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();

          const location = {
            lat: latitude,
            lng: longitude,
            address:
              data.display_name ||
              `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
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
    if (locationEnabled && currentLocation) {
      onSearch(searchQuery, currentLocation);
    } else {
      onSearch(searchQuery);
    }
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
        <div className="search-input-group">
          <input
            type="text"
            className="search-input"
            placeholder="Cerca servizi di pulizia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-button">
            🔍 Cerca
          </button>
        </div>

        <div className="location-controls">
          <div
            className="location-input-wrapper"
            style={{ position: "relative" }}
          >
            <input
              type="text"
              className="location-input"
              placeholder="Inserisci indirizzo o città..."
              value={locationQuery}
              onChange={handleLocationChange}
              onFocus={() => locationResults.length > 0 && setShowResults(true)}
            />

            {/* Dropdown results */}
            {showResults && locationResults.length > 0 && (
              <ul className="location-results-dropdown">
                {locationResults.map((result) => (
                  <li
                    key={result.place_id}
                    onClick={() => selectLocation(result)}
                    className="location-result-item"
                  >
                    📍 {result.display_name}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="location-button"
              onClick={handleGetCurrentLocation}
              title="Usa la mia posizione"
            >
              📍 Posizione attuale
            </button>
          </div>

          {locationEnabled && currentLocation && (
            <div className="location-active">
              <button
                type="button"
                className="clear-location-button"
                onClick={handleClearLocation}
                title="Rimuovi posizione"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
