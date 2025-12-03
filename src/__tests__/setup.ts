// Mock del PrismaClient per i test
export const prismaMock = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  service: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  review: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  chatMessage: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $disconnect: jest.fn(),
};

// Mock per l'email service
export const emailServiceMock = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
};

// Mock per il logger
export const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

export const authLoggerMock = {
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  tokenRefresh: jest.fn(),
};

// Helper per resettare tutti i mock
export const resetAllMocks = () => {
  jest.clearAllMocks();
};

// Helper per creare un utente mock
export const createMockUser = (overrides = {}) => ({
  id: "user-123",
  email: "test@example.com",
  username: "testuser",
  password: "$2a$10$hashedpassword",
  displayName: "Test User",
  firstName: "Test",
  lastName: "User",
  phone: null,
  city: null,
  userType: "client",
  isClient: true,
  isProvider: false,
  isAdmin: false,
  adminLevel: null,
  acceptedTerms: true,
  acceptedProviderTerms: false,
  isVerified: true,
  verificationToken: null,
  verificationTokenExpires: null,
  googleId: null,
  isBlocked: false,
  isDeleted: false,
  createdAt: new Date(),
  ...overrides,
});

// Helper per creare un servizio mock
export const createMockService = (overrides = {}) => ({
  id: "service-123",
  providerId: "provider-123",
  providerEmail: "provider@example.com",
  title: "Test Service",
  description: "A test service description",
  category: "Pulizia Casa",
  price: 25.0,
  priceType: "hourly",
  imageUrl: null,
  address: "Via Test 123, Milano",
  latitude: 45.4642,
  longitude: 9.19,
  productsUsed: "[]",
  extraServices: null,
  availability: null,
  workingHoursStart: "08:00",
  workingHoursEnd: "18:00",
  slotDurationMinutes: 60,
  coverageRadiusKm: 20,
  createdAt: new Date(),
  ...overrides,
});

// Helper per creare una prenotazione mock
export const createMockBooking = (overrides = {}) => ({
  id: "booking-123",
  serviceId: "service-123",
  clientId: "client-123",
  clientEmail: "client@example.com",
  providerId: "provider-123",
  providerEmail: "provider@example.com",
  serviceTitle: "Test Service",
  date: new Date(),
  preferredTime: "10:00",
  startTime: "10:00",
  endTime: "12:00",
  estimatedDuration: 120,
  status: "pending",
  paymentStatus: "pending",
  paymentIntentId: null,
  stripeSessionId: null,
  amount: 50.0,
  notes: null,
  address: "Via Test 123",
  clientPhone: null,
  squareMetersRange: null,
  windowsCount: null,
  selectedExtras: null,
  createdAt: new Date(),
  completedAt: null,
  ...overrides,
});
