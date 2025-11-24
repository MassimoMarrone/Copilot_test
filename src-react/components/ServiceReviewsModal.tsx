import React, { useState, useEffect } from "react";
import "../styles/Modal.css";
import "../styles/ServiceReviewsModal.css";
import { reviewService, Review } from "../services/reviewService";

interface ServiceReviewsModalProps {
  serviceId: string;
  serviceTitle: string;
  onClose: () => void;
}

const ServiceReviewsModal: React.FC<ServiceReviewsModalProps> = ({
  serviceId,
  serviceTitle,
  onClose,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await reviewService.getServiceReviews(serviceId);
        setReviews(data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError("Impossibile caricare le recensioni al momento.");
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [serviceId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content reviews-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>Recensioni per {serviceTitle}</h2>

        {loading ? (
          <div className="loading-spinner">Caricamento recensioni...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            Nessuna recensione ancora disponibile per questo servizio.
          </div>
        ) : (
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <span className="review-author">
                    {review.clientName || "Cliente"}
                  </span>
                  <span className="review-date">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                <div className="review-rating">
                  {"⭐".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </div>
                <p className="review-comment">{review.comment}</p>

                {review.providerReply && (
                  <div className="provider-reply">
                    <div className="reply-header">
                      <strong>Risposta del fornitore</strong>
                      {review.providerReplyCreatedAt && (
                        <span className="reply-date">
                          {formatDate(review.providerReplyCreatedAt)}
                        </span>
                      )}
                    </div>
                    <p className="reply-content">{review.providerReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceReviewsModal;
