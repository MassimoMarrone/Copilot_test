/**
 * Tipi per Provider - Review
 * Service e Booking sono ora in types/service.ts e types/booking.ts
 */

export interface Review {
  id: string;
  bookingId: string;
  serviceId: string;
  clientId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
