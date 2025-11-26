import { get } from "./api";

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface EstimatedDuration {
  minutes: number;
  hours: number;
  formatted: string;
}

export interface AvailableSlotsResponse {
  slots: TimeSlot[];
  estimatedDuration: number;
  estimatedDurationFormatted: string;
  calculatedPrice: number;
  workingHours: {
    start: string;
    end: string;
  };
}

export interface PriceEstimateResponse {
  serviceTitle: string;
  basePrice: number;
  priceType: string;
  estimatedDuration: EstimatedDuration;
  calculatedPrice: number;
  breakdown: string;
}

export const SQUARE_METERS_OPTIONS = [
  {
    value: "0-50",
    label: "Fino a 50 m²",
    description: "Monolocale / Bilocale",
  },
  { value: "50-80", label: "50-80 m²", description: "Trilocale" },
  { value: "80-120", label: "80-120 m²", description: "Quadrilocale" },
  { value: "120+", label: "Oltre 120 m²", description: "Grande appartamento" },
];

export const WINDOWS_COUNT_OPTIONS = [
  { value: 0, label: "0", description: "Nessuna" },
  { value: 2, label: "1-4", description: "Poche" },
  { value: 5, label: "4-6", description: "Standard" },
  { value: 8, label: "6-10", description: "Molte" },
];

export const schedulingService = {
  /**
   * Get estimated duration based on apartment details
   */
  getEstimatedDuration: async (
    squareMetersRange: string,
    windowsCount: number
  ): Promise<EstimatedDuration> => {
    return get<EstimatedDuration>(
      `/api/scheduling/estimate-duration?squareMetersRange=${encodeURIComponent(
        squareMetersRange
      )}&windowsCount=${windowsCount}`
    );
  },

  /**
   * Get available time slots for a service on a specific date
   */
  getAvailableSlots: async (
    serviceId: string,
    date: string,
    squareMetersRange?: string,
    windowsCount?: number
  ): Promise<AvailableSlotsResponse> => {
    let url = `/api/scheduling/services/${serviceId}/available-slots?date=${date}`;
    if (squareMetersRange) {
      url += `&squareMetersRange=${encodeURIComponent(squareMetersRange)}`;
    }
    if (windowsCount !== undefined) {
      url += `&windowsCount=${windowsCount}`;
    }
    return get<AvailableSlotsResponse>(url);
  },

  /**
   * Get price estimate for a service
   */
  getPriceEstimate: async (
    serviceId: string,
    squareMetersRange: string,
    windowsCount: number
  ): Promise<PriceEstimateResponse> => {
    return get<PriceEstimateResponse>(
      `/api/scheduling/services/${serviceId}/price-estimate?squareMetersRange=${encodeURIComponent(
        squareMetersRange
      )}&windowsCount=${windowsCount}`
    );
  },
};
