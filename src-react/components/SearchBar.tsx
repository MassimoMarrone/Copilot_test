import React, { useEffect, useRef, useState } from 'react';
import '../styles/SearchBar.css';

interface SearchBarProps {
  onSearch: (query: string, location?: { lat: number; lng: number; address: string }) => void;
  googleMapsApiKey: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, googleMapsApiKey }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load Google Maps Script
  useEffect(() => {
    if (!googleMapsApiKey) return;

    const loadGoogleMapsScript = () => {
      if (window.google?.maps?.places) {
        initAutocomplete();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initAutocomplete();
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, [googleMapsApiKey]);

  const initAutocomplete = () => {
    if (!autocompleteInputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(
      autocompleteInputRef.current,
      {
        types: ['address'],
        componentRestrictions: { country: 'it' }, // Restrict to Italy
      }
    );

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place && place.geometry && place.geometry.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address || '',
        };
        setCurrentLocation(location);
        setLocationEnabled(true);
      }
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalizzazione non è supportata dal tuo browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        if (window.google?.maps) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const location = {
                  lat: latitude,
                  lng: longitude,
                  address: results[0].formatted_address,
                };
                setCurrentLocation(location);
                setLocationEnabled(true);
                if (autocompleteInputRef.current) {
                  autocompleteInputRef.current.value = location.address;
                }
              }
            }
          );
        } else {
          const location = {
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          };
          setCurrentLocation(location);
          setLocationEnabled(true);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Impossibile ottenere la posizione corrente');
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
    if (autocompleteInputRef.current) {
      autocompleteInputRef.current.value = '';
    }
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
          <div className="location-input-wrapper">
            <input
              ref={autocompleteInputRef}
              type="text"
              className="location-input"
              placeholder="Inserisci indirizzo o città..."
              disabled={!googleMapsApiKey}
            />
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
              <span className="location-text">
                📍 {currentLocation.address}
              </span>
              <button
                type="button"
                className="clear-location-button"
                onClick={handleClearLocation}
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
