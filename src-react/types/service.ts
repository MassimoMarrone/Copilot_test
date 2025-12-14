/**
 * Tipi unificati per Service
 * Usare questa definizione in tutto il frontend invece di duplicarla
 */

import { ProviderAvailability } from "../components/AvailabilityManager";

export interface ExtraService {
  name: string;
  price: number;
}

export interface Service {
  id: string;
  providerId?: string;
  title: string;
  description: string;
  category?: string;
  price: number;
  priceType?: "fixed" | "hourly" | "per_sqm";
  productsUsed?: string[];
  providerEmail: string;
  providerName?: string;
  providerAvatar?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  imageUrl?: string;
  availability?: ProviderAvailability;
  extraServices?: ExtraService[];
  coverageRadiusKm?: number;
  averageRating?: number;
  reviewCount?: number;
  // Scheduling settings
  workingHoursStart?: string;
  workingHoursEnd?: string;
  slotDurationMinutes?: number;
}

export interface ServiceWithProvider extends Service {
  provider?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
}
