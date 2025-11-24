import React, { useState, useRef } from "react";
import "../styles/SearchBar.css"; // Reuse styles for now or create new ones
import { locationService, LocationResult } from "../services/locationService";

interface AddressAutocompleteProps {
  onSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialValue?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onSelect,
  initialValue = "",
}) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await locationService.searchAddress(value);
        if (Array.isArray(data)) {
          setResults(data);
          setShowResults(true);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    }, 500);
  };

  const handleSelect = (result: LocationResult) => {
    const location = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name,
    };
    setQuery(result.display_name);
    setShowResults(false);
    onSelect(location);
  };

  return (
    <div className="address-autocomplete" style={{ position: "relative" }}>
      <input
        type="text"
        className="form-control" // Assuming standard class or I'll add styles
        placeholder="Inserisci indirizzo..."
        value={query}
        onChange={handleInputChange}
        onFocus={() => results.length > 0 && setShowResults(true)}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          border: "2px solid #e0e0e0",
        }}
      />
      {showResults && results.length > 0 && (
        <ul
          className="location-results-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
            listStyle: "none",
            padding: 0,
            margin: 0,
            maxHeight: "200px",
            overflowY: "auto",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          {results.map((result) => (
            <li
              key={result.place_id}
              onClick={() => handleSelect(result)}
              style={{
                padding: "10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "white")
              }
            >
              📍 {result.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
