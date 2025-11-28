import React from "react";
import "../styles/Skeleton.css";

const ServiceCardSkeleton: React.FC = () => {
  return (
    <div className="service-card skeleton-card">
      <div className="skeleton skeleton-image"></div>
      <div className="service-content">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-price"></div>
        <div className="skeleton skeleton-rating"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text short"></div>
        <div className="skeleton skeleton-button"></div>
      </div>
    </div>
  );
};

export default ServiceCardSkeleton;
