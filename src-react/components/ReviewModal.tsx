import React, { useState } from "react";
import "../styles/Modal.css"; // Assuming a generic modal style

interface Booking {
  id: string;
  serviceTitle: string;
}

interface ReviewModalProps {
  booking: Booking;
  onClose: () => void;
  onReviewSubmit: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  booking,
  onClose,
  onReviewSubmit,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (comment.length < 10) {
      setError("Il commento deve contenere almeno 10 caratteri.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${booking.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating, comment }),
      });

      if (response.ok) {
        alert("Recensione inviata con successo!");
        onReviewSubmit();
      } else {
        const data = await response.json();
        setError(data.error || "Errore durante l'invio della recensione.");
      }
    } catch (err) {
      setError("Errore di connessione. Riprova più tardi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>Lascia una Recensione</h2>
        <p>
          Stai recensendo il servizio: <strong>{booking.serviceTitle}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Valutazione (da 1 a 5 stelle):</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={star <= rating ? "star filled" : "star"}
                  onClick={() => setRating(star)}
                >
                  &#9733;
                </span>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="comment">Commento:</label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              minLength={10}
              maxLength={1000}
              required
              placeholder="Descrivi la tua esperienza..."
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="button-group">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Invio in corso..." : "Invia Recensione"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
