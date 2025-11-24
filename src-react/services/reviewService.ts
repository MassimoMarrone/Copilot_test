import { get, post } from "./api";

export interface Review {
  id: string;
  serviceId: string;
  clientId: string;
  bookingId: string;
  providerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  client?: {
    displayName?: string;
    email?: string;
  };
  service?: {
    title: string;
  };
}

export const reviewService = {
  // Create a review
  createReview: async (data: {
    serviceId: string;
    rating: number;
    comment?: string;
  }): Promise<Review> => {
    return post<Review>("/api/reviews", data);
  },

  // Get reviews for a service
  getServiceReviews: async (serviceId: string): Promise<Review[]> => {
    return get<Review[]>(`/api/reviews/service/${serviceId}`);
  },

  // Get provider's reviews
  getMyReviews: async (): Promise<Review[]> => {
    return get<Review[]>("/api/my-reviews");
  },

  // Mark review as helpful
  markHelpful: async (
    reviewId: string
  ): Promise<{ success: boolean; helpfulCount: number }> => {
    return post<{ success: boolean; helpfulCount: number }>(
      `/api/reviews/${reviewId}/helpful`,
      {}
    );
  },
};
