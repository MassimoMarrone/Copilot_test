import { ProviderAvailability } from "../components/AvailabilityManager";

export interface Service {
  id: string;
  title: string;
  description: string;
  category?: string;
  price: number;
  productsUsed?: string[];
  providerEmail: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  imageUrl?: string;
  availability?: ProviderAvailability;
  extraServices?: { name: string; price: number }[];
  coverageRadiusKm?: number;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceTitle: string;
  date: string;
  amount: number;
  clientEmail: string;
  status: string;
  paymentStatus: string;
  photoProof?: string;
  clientPhone?: string;
  preferredTime?: string;
  notes?: string;
  address?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  serviceId: string;
  clientId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
