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

export const servicesService = {
  // Get all services with pagination (public)
  getAllServices: async (page: number = 1, limit: number = 12): Promise<PaginatedServices> => {
    return get<PaginatedServices>(`/api/services?page=${page}&limit=${limit}`);
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
