export interface LocationResult {
  place_id: string;
  lat: string;
  lon: string;
  display_name: string;
}

export const locationService = {
  searchAddress: async (query: string): Promise<LocationResult[]> => {
    const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
    if (!apiKey) {
      console.warn("LocationIQ API key is missing");
      return [];
    }

    try {
      const response = await fetch(
        `https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(
          query
        )}&format=json&countrycodes=it&limit=5`
      );

      if (!response.ok) {
        throw new Error("Location search failed");
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error fetching location:", error);
      return [];
    }
  },

  reverseGeocode: async (lat: number, lon: number): Promise<string | null> => {
    const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
    if (!apiKey) {
      console.warn("LocationIQ API key is missing");
      return null;
    }

    try {
      const response = await fetch(
        `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${lat}&lon=${lon}&format=json`
      );

      if (!response.ok) {
        throw new Error("Reverse geocoding failed");
      }

      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return null;
    }
  },
};
