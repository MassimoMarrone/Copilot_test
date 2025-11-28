import { get, post, put, del, upload } from "./api";

export interface Service {
  id: string;
  providerId: string;
  title: string;
  description: string;
  price: number;
  providerEmail: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  averageRating?: number;
  reviewCount?: number;
  imageUrl?: string;
  productsUsed?: string[];
  availability?: any;
}

export interface PaginatedServices {
  services: Service[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  products?: string[];
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export const servicesService = {
  // Get all services with pagination and filters (public)
  getAllServices: async (
    page: number = 1,
    limit: number = 12,
    filters?: SearchFilters
  ): Promise<PaginatedServices> => {
    let url = `/api/services?page=${page}&limit=${limit}`;
    
    if (filters) {
      if (filters.query) {
        url += `&query=${encodeURIComponent(filters.query)}`;
      }
      if (filters.category && filters.category !== "Tutte") {
        url += `&category=${encodeURIComponent(filters.category)}`;
      }
      if (filters.minPrice !== undefined && filters.minPrice > 0) {
        url += `&minPrice=${filters.minPrice}`;
      }
      if (filters.maxPrice !== undefined && filters.maxPrice < Infinity) {
        url += `&maxPrice=${filters.maxPrice}`;
      }
      if (filters.products && filters.products.length > 0) {
        url += `&products=${encodeURIComponent(filters.products.join(','))}`;
      }
      if (filters.latitude && filters.longitude) {
        url += `&latitude=${filters.latitude}&longitude=${filters.longitude}`;
        if (filters.radiusKm) {
          url += `&radiusKm=${filters.radiusKm}`;
        }
      }
    }
    
    return get<PaginatedServices>(url);
  },

  // Get provider's own services
  getMyServices: async (): Promise<Service[]> => {
    return get<Service[]>("/api/my-services");
  },

  // Create a new service
  createService: async (formData: FormData): Promise<Service> => {
    return upload<Service>("/api/services", formData, "POST");
  },

  // Update a service
  updateService: async (id: string, formData: FormData): Promise<Service> => {
    return upload<Service>(`/api/services/${id}`, formData, "PUT");
  },

  // Update service availability (JSON only)
  updateAvailability: async (
    id: string,
    availability: any
  ): Promise<Service> => {
    // Since the backend expects multipart/form-data for updates if we use the same endpoint,
    // but we can also send JSON if the backend supports it.
    // Looking at the backend code, it uses `upload.single('image')` middleware which might interfere with JSON body parsing
    // if not handled correctly, but usually express handles mixed types if configured.
    // However, the backend controller checks `req.body`.
    // To be safe and consistent with the current implementation in ProviderDashboard, we'll use FormData.
    const formData = new FormData();
    formData.append("availability", JSON.stringify(availability));
    return upload<Service>(`/api/services/${id}`, formData, "PUT");
  },

  // Delete a service
  deleteService: async (id: string): Promise<{ success: boolean }> => {
    return del<{ success: boolean }>(`/api/services/${id}`);
  },

  // Get booked dates for a service
  getBookedDates: async (
    serviceId: string
  ): Promise<{ bookedDates: string[] }> => {
    return get<{ bookedDates: string[] }>(
      `/api/services/${serviceId}/booked-dates`
    );
  },
};
