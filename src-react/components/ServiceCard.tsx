import React from "react";
import { Service } from "../services/servicesService";
import "../styles/ServiceCard.css";

interface ServiceCardProps {
  service: Service;
  onBook: (service: Service) => void;
  onReview: (service: Service) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onBook,
  onReview,
}) => {
  return (
    <div className="service-card">
      <div className="service-card-image-container">
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt={service.title}
            className="service-image"
          />
        ) : (
          <div className="service-image-placeholder">
            <span>{service.title.charAt(0)}</span>
          </div>
        )}
        <div className="service-price-badge">
          €{service.price.toFixed(2)}
        </div>
      </div>

      <div className="service-content">
        <div className="service-header">
          <h3 className="service-title">{service.title}</h3>
          <div
            className="service-rating"
            onClick={(e) => {
              e.stopPropagation();
              onReview(service);
            }}
            title="Clicca per vedere le recensioni"
          >
            <span className="rating-content">
              <span className="star-icon">★</span>
              <span className="rating-value">
                {service.averageRating ? service.averageRating.toFixed(1) : "Nuovo"}
              </span>
              {(service.reviewCount || 0) > 0 && (
                <>
                  <span className="rating-separator">•</span>
                  <span className="review-label">
                    {service.reviewCount} recensioni
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="provider-info">
          <a
            href={`/provider/${service.providerId}`}
            className="provider-profile-link"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="provider-avatar">
              {service.providerAvatar ? (
                <img src={service.providerAvatar} alt={service.providerName} />
              ) : (
                <span>{(service.providerName || "F")[0]}</span>
              )}
            </div>
            <span className="provider-name">
              {service.providerName || "Fornitore"}
            </span>
          </a>
        </div>

        <p className="service-description">{service.description}</p>

        {service.productsUsed && service.productsUsed.length > 0 && (
          <div className="service-products">
            {service.productsUsed.slice(0, 3).map((product) => (
              <span key={product} className="product-tag">
                {product}
              </span>
            ))}
            {service.productsUsed.length > 3 && (
              <span className="product-tag-more">
                +{service.productsUsed.length - 3}
              </span>
            )}
          </div>
        )}



        <div className="service-actions">
          <button
            className="btn-book"
            onClick={(e) => {
              e.stopPropagation();
              onBook(service);
            }}
          >
            Prenota Ora
          </button>

        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
