import React from "react";
import { Review } from "../../types/provider";

interface ReviewListProps {
  reviews: Review[];
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
  if (reviews.length === 0) {
    return (
      <div className="empty-state">
        <p>Non hai ancora ricevuto recensioni.</p>
      </div>
    );
  }

  return (
    <div className="reviews-list">
      {reviews.map((review) => (
        <div key={review.id} className="review-card">
          <div className="review-header">
            <span className="review-rating">
              {"⭐".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </span>
            <span className="review-date">
              {new Date(review.createdAt).toLocaleDateString("it-IT")}
            </span>
          </div>
          <p className="review-comment">{review.comment}</p>
        </div>
      ))}
    </div>
  );
};

export default ReviewList;
