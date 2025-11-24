import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/ProviderProfilePage.css";

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  averageRating?: number;
  reviewCount?: number;
}

interface Review {
  id: string;
  rating: number;
  ratingDetails?: {
    punctuality: number;
    communication: number;
    quality: number;
  };
  comment: string;
  clientName: string;
  createdAt: string;
  providerReply?: string;
  helpfulCount?: number;
}

interface ProviderProfile {
  id: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  createdAt: string;
  services: Service[];
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
}

const ProviderProfilePage: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "newest" | "highest" | "lowest" | "helpful"
  >("newest");
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, boolean>>({}); // Track local votes

  useEffect(() => {
    if (providerId) {
      loadProviderProfile(providerId);
    }
  }, [providerId]);

  const loadProviderProfile = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/providers/${id}`);
      if (!response.ok) {
        throw new Error("Provider not found");
      }
      const data = await response.json();
      setProvider(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHelpfulVote = async (reviewId: string) => {
    if (!user) {
      alert("Devi effettuare il login per votare.");
      return;
    }

    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        setProvider((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            reviews: prev.reviews.map((r) =>
              r.id === reviewId ? { ...r, helpfulCount: data.helpfulCount } : r
            ),
          };
        });
        setHelpfulVotes((prev) => ({
          ...prev,
          [reviewId]: data.isHelpful,
        }));
      }
    } catch (error) {
      console.error("Error voting helpful:", error);
    }
  };

  const getSortedReviews = () => {
    if (!provider) return [];
    const reviews = [...provider.reviews];

    switch (sortBy) {
      case "highest":
        return reviews.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return reviews.sort((a, b) => a.rating - b.rating);
      case "helpful":
        return reviews.sort(
          (a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0)
        );
      case "newest":
      default:
        return reviews.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  };

  const handleBookService = (serviceId: string) => {
    if (!user) {
      // Redirect to login or show login modal
      alert("Devi effettuare il login per prenotare.");
      return;
    }
    // Navigate to client dashboard with pre-selected service or open booking modal
    // For now, let's just navigate to services page or client dashboard
    // Ideally, we should open the booking modal directly.
    // Since the booking logic is in ClientDashboard, we might want to refactor it or redirect.
    // A simple way is to redirect to client dashboard and pass serviceId in query params?
    // Or better, implement booking logic here or in a shared component.

    // For this iteration, let's redirect to client dashboard with a query param
    // But ClientDashboard expects to load all services.

    // Let's just alert for now as a placeholder or redirect to services page
    navigate("/client-dashboard");
  };

  if (loading) return <div className="loading">Caricamento profilo...</div>;
  if (error) return <div className="error">Errore: {error}</div>;
  if (!provider) return <div className="error">Profilo non trovato</div>;

  const sortedReviews = getSortedReviews();

  return (
    <div className="provider-profile-page">
      <div className="profile-header">
        <div className="profile-cover"></div>
        <div className="profile-info-container">
          <div className="profile-avatar">
            {provider.avatarUrl ? (
              <img src={provider.avatarUrl} alt={provider.displayName} />
            ) : (
              <div className="avatar-placeholder">
                {provider.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-details">
            <h1>{provider.displayName}</h1>
            <div className="profile-stats">
              <span className="rating">
                ⭐ {provider.averageRating.toFixed(1)} ({provider.reviewCount}{" "}
                recensioni)
              </span>
              <span className="joined-date">
                Membro dal {new Date(provider.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="profile-bio">
              {provider.bio || "Nessuna biografia disponibile."}
            </p>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="services-section">
          <h2>Servizi Offerti</h2>
          <div className="services-grid">
            {provider.services.map((service) => (
              <div key={service.id} className="service-card">
                {service.imageUrl && (
                  <img
                    src={service.imageUrl}
                    alt={service.title}
                    className="service-image"
                  />
                )}
                <div className="service-info">
                  <h3>{service.title}</h3>
                  <p className="service-price">€{service.price.toFixed(2)}</p>
                  <p className="service-description">{service.description}</p>
                  <button
                    className="btn-book"
                    onClick={() => handleBookService(service.id)}
                  >
                    Prenota
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="reviews-section">
          <div className="reviews-header-row">
            <h2>Recensioni</h2>
            <div className="sort-controls">
              <label>Ordina per:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">Più recenti</option>
                <option value="highest">Voto più alto</option>
                <option value="lowest">Voto più basso</option>
                <option value="helpful">Più utili</option>
              </select>
            </div>
          </div>

          <div className="reviews-list">
            {sortedReviews.length === 0 ? (
              <p>Nessuna recensione ancora.</p>
            ) : (
              sortedReviews.map((review) => (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                    <span className="review-author">{review.clientName}</span>
                    <span className="review-rating">⭐ {review.rating}</span>
                    <span className="review-date">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {review.ratingDetails && (
                    <div className="review-details">
                      <span title="Puntualità">
                        🕒 {review.ratingDetails.punctuality}
                      </span>
                      <span title="Comunicazione">
                        💬 {review.ratingDetails.communication}
                      </span>
                      <span title="Qualità">
                        ✨ {review.ratingDetails.quality}
                      </span>
                    </div>
                  )}

                  <p className="review-comment">{review.comment}</p>

                  <div className="review-footer">
                    <button
                      className={`btn-helpful ${
                        helpfulVotes[review.id] ? "voted" : ""
                      }`}
                      onClick={() => handleHelpfulVote(review.id)}
                    >
                      👍 Utile ({review.helpfulCount || 0})
                    </button>
                  </div>

                  {review.providerReply && (
                    <div className="provider-reply">
                      <strong>Risposta del fornitore:</strong>
                      <p>{review.providerReply}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderProfilePage;
