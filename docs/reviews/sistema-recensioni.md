# ⭐ Sistema Recensioni

## Panoramica
Il sistema recensioni permette ai clienti di valutare i servizi ricevuti e ai fornitori di ricevere feedback per migliorare.

## Flusso Recensione

```
╔═══════════════════════════════════════════════════════════════╗
║                   FLUSSO RECENSIONE                           ║
╚═══════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────┐
│  1. SERVIZIO COMPLETATO                                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Provider marca servizio come "completed"               │ │
│  │  → Notifica al cliente: "Lascia una recensione!"        │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  2. CLIENTE ACCEDE AL MODAL RECENSIONE                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Via:                                                   │ │
│  │  • Dashboard → Storico → "Lascia Recensione"           │ │
│  │  • Notifica click                                       │ │
│  │  • Email con link diretto                               │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  3. COMPILAZIONE RECENSIONE                                   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ╭─────────────────────────────────────────────────╮   │ │
│  │  │     Come valuti il servizio ricevuto?           │   │ │
│  │  │                                                  │   │ │
│  │  │           ⭐ ⭐ ⭐ ⭐ ⭐                         │   │ │
│  │  │           (seleziona 1-5 stelle)                │   │ │
│  │  │                                                  │   │ │
│  │  │     ┌────────────────────────────────────────┐  │   │ │
│  │  │     │ Racconta la tua esperienza...         │  │   │ │
│  │  │     │                                       │  │   │ │
│  │  │     │                                       │  │   │ │
│  │  │     └────────────────────────────────────────┘  │   │ │
│  │  │                                                  │   │ │
│  │  │     [  Pubblica Recensione  ]                   │   │ │
│  │  ╰─────────────────────────────────────────────────╯   │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  4. SALVATAGGIO E AGGIORNAMENTO STATS                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  • Salva recensione nel database                        │ │
│  │  • Ricalcola media rating servizio                      │ │
│  │  • Incrementa reviewCount                               │ │
│  │  • Notifica fornitore: "Nuova recensione!"              │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Componente ReviewModal

```tsx
// src-react/components/ReviewModal.tsx
interface ReviewModalProps {
  booking: Booking;
  onClose: () => void;
  onSubmit: (review: ReviewData) => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ booking, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      showToast({ type: 'error', message: 'Seleziona un punteggio' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/reviews', {
        bookingId: booking.id,
        serviceId: booking.serviceId,
        providerId: booking.service.providerId,
        rating,
        comment,
      });
      
      showToast({ type: 'success', message: 'Recensione pubblicata!' });
      onSubmit({ rating, comment });
      onClose();
    } catch (error) {
      showToast({ type: 'error', message: 'Errore durante l\'invio' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <h2>Lascia una recensione</h2>
        
        <div className="service-info">
          <img src={booking.service.images[0]} alt="" />
          <div>
            <h4>{booking.service.name}</h4>
            <p>{booking.service.provider.name}</p>
            <span className="date">{formatDate(booking.date)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div className="rating-section">
            <label>Come valuti il servizio?</label>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= (hoverRating || rating) ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </button>
              ))}
            </div>
            <span className="rating-label">
              {getRatingLabel(rating)}
            </span>
          </div>

          {/* Comment */}
          <div className="comment-section">
            <label>Racconta la tua esperienza (opzionale)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descrivi il servizio ricevuto..."
              maxLength={500}
              rows={4}
            />
            <span className="char-count">{comment.length}/500</span>
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? 'Invio...' : 'Pubblica Recensione'}
          </button>
        </form>
      </div>
    </div>
  );
};

function getRatingLabel(rating: number): string {
  const labels = {
    0: '',
    1: 'Pessimo',
    2: 'Scarso',
    3: 'Nella media',
    4: 'Buono',
    5: 'Eccellente',
  };
  return labels[rating as keyof typeof labels];
}
```

## Visualizzazione Recensioni Servizio

```tsx
// src-react/components/ServiceReviewsModal.tsx
const ServiceReviewsModal: React.FC<Props> = ({ serviceId, onClose }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [filter, setFilter] = useState<number | null>(null);

  useEffect(() => {
    loadReviews();
  }, [serviceId, filter]);

  return (
    <div className="reviews-modal">
      <div className="reviews-header">
        <h2>Recensioni</h2>
        <button onClick={onClose}>×</button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="reviews-stats">
          <div className="overall-rating">
            <span className="rating-number">{stats.averageRating.toFixed(1)}</span>
            <StarRating rating={stats.averageRating} />
            <span className="total-reviews">{stats.totalReviews} recensioni</span>
          </div>

          <div className="rating-breakdown">
            {[5, 4, 3, 2, 1].map((star) => (
              <div 
                key={star} 
                className={`rating-bar ${filter === star ? 'active' : ''}`}
                onClick={() => setFilter(filter === star ? null : star)}
              >
                <span>{star}⭐</span>
                <div className="bar">
                  <div 
                    className="fill" 
                    style={{ 
                      width: `${(stats.distribution[star] / stats.totalReviews) * 100}%` 
                    }}
                  />
                </div>
                <span>{stats.distribution[star]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {reviews.map((review) => (
          <div key={review.id} className="review-item">
            <div className="review-header">
              <img 
                src={review.user.avatar || '/default-avatar.png'} 
                alt="" 
                className="reviewer-avatar"
              />
              <div>
                <span className="reviewer-name">{review.user.name}</span>
                <StarRating rating={review.rating} size="small" />
              </div>
              <span className="review-date">{formatDate(review.createdAt)}</span>
            </div>
            {review.comment && (
              <p className="review-comment">{review.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Backend: Servizio Recensioni

```typescript
// src/services/reviewService.ts
import { prisma } from "../server";

interface CreateReviewParams {
  bookingId: string;
  serviceId: string;
  providerId: string;
  userId: string;
  rating: number;
  comment?: string;
}

export const reviewService = {
  async createReview(params: CreateReviewParams) {
    const { bookingId, serviceId, providerId, userId, rating, comment } = params;

    // Verifica che la prenotazione esista e sia completata
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.status !== 'completed') {
      throw new Error('Prenotazione non valida o non completata');
    }

    // Verifica che non esista già una recensione
    const existingReview = await prisma.review.findFirst({
      where: { bookingId },
    });

    if (existingReview) {
      throw new Error('Hai già recensito questo servizio');
    }

    // Crea recensione
    const review = await prisma.review.create({
      data: {
        bookingId,
        serviceId,
        providerId,
        userId,
        rating,
        comment,
      },
    });

    // Aggiorna statistiche servizio
    await this.updateServiceStats(serviceId);

    // Notifica fornitore
    await notificationService.createNotification({
      userId: providerId,
      title: 'Nuova recensione!',
      message: `Hai ricevuto una recensione ${rating}⭐`,
      type: 'info',
    });

    return review;
  },

  async updateServiceStats(serviceId: string) {
    const stats = await prisma.review.aggregate({
      where: { serviceId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        rating: stats._avg.rating || 0,
        reviewCount: stats._count.rating,
      },
    });
  },

  async getServiceReviews(serviceId: string, filter?: number) {
    const where: any = { serviceId };
    if (filter) {
      where.rating = filter;
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: { name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = await prisma.review.groupBy({
      by: ['rating'],
      where: { serviceId },
      _count: { rating: true },
    });

    return { reviews, stats };
  },
};
```

## Schema Database

```prisma
model Review {
  id         String   @id @default(cuid())
  bookingId  String   @unique
  serviceId  String
  providerId String
  userId     String
  rating     Int      // 1-5
  comment    String?
  createdAt  DateTime @default(now())
  
  booking    Booking  @relation(fields: [bookingId])
  service    Service  @relation(fields: [serviceId])
  provider   User     @relation("ProviderReviews", fields: [providerId])
  user       User     @relation("UserReviews", fields: [userId])
  
  @@index([serviceId])
  @@index([providerId])
}
```

## API Endpoints

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/reviews` | Crea nuova recensione |
| GET | `/api/reviews/service/:id` | Recensioni di un servizio |
| GET | `/api/reviews/provider/:id` | Recensioni di un fornitore |
| GET | `/api/reviews/my-reviews` | Le mie recensioni |

## Componente StarRating

```tsx
// src-react/components/StarRating.tsx
interface StarRatingProps {
  rating: number;
  size?: 'small' | 'medium' | 'large';
  showNumber?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  size = 'medium',
  showNumber = false 
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  const sizeMap = {
    small: 14,
    medium: 18,
    large: 24,
  };

  const starSize = sizeMap[size];

  return (
    <div className={`star-rating star-rating-${size}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={starSize}
          height={starSize}
          viewBox="0 0 24 24"
          className={`star ${
            star <= fullStars
              ? 'full'
              : star === fullStars + 1 && hasHalfStar
              ? 'half'
              : 'empty'
          }`}
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill="currentColor"
          />
        </svg>
      ))}
      {showNumber && (
        <span className="rating-number">{rating.toFixed(1)}</span>
      )}
    </div>
  );
};
```

## Validazioni

- ⭐ Rating obbligatorio (1-5)
- 📝 Commento opzionale, max 500 caratteri
- 🔒 Solo chi ha completato il servizio può recensire
- 🚫 Una sola recensione per prenotazione
- ⏰ Possibile recensire entro 30 giorni dal completamento
