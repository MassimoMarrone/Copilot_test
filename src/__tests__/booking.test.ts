import request from 'supertest';
import { httpServer, io } from '../server';
import fs from 'fs';
import { Service, User, Booking } from '../types';
import Stripe from 'stripe';

// Mock the file system
let mockFiles: { [key: string]: string } = {};
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: (path: string) => mockFiles[path] !== undefined,
  readFileSync: (path: string) => mockFiles[path] || '[]',
  writeFileSync: jest.fn((path: string, data: string) => {
    mockFiles[path] = data;
  }),
  createReadStream: jest.fn(), // Needed for supertest file uploads
}));

// Mock the Stripe library
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
  paymentIntents: {
    capture: jest.fn(),
  },
  transfers: {
    create: jest.fn(),
  },
};
jest.mock('stripe', () => {
  return jest.fn(() => mockStripe);
});

describe('Booking and Payment Flow', () => {
  let providerAgent: request.SuperAgentTest;
  let clientAgent: request.SuperAgentTest;
  let service: Service;

  beforeEach(async () => {
    // Reset mocks
    mockFiles = {
      'data/users.json': '[]',
      'data/services.json': '[]',
      'data/bookings.json': '[]',
    };
    (fs.writeFileSync as jest.Mock).mockClear();
    (mockStripe.checkout.sessions.create as jest.Mock).mockClear();
    (mockStripe.checkout.sessions.retrieve as jest.Mock).mockClear();
    (mockStripe.paymentIntents.capture as jest.Mock).mockClear();
    (mockStripe.transfers.create as jest.Mock).mockClear();

    // Setup client
    clientAgent = request.agent(httpServer);
    await clientAgent.post('/api/register').send({ email: 'client-book@example.com', password: 'password123', acceptedTerms: true });

    // Setup provider and a service
    providerAgent = request.agent(httpServer);
    await providerAgent.post('/api/register').send({ email: 'provider-book@example.com', password: 'password123', acceptedTerms: true });
    await providerAgent.post('/api/become-provider').send({ acceptedProviderTerms: true });
    
    const serviceRes = await providerAgent.post('/api/services').send({ title: 'Testable Service', description: 'Desc', price: 100 });
    service = serviceRes.body;
  });

  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  it('should handle the full booking, payment, and completion flow', async () => {
    // --- Step 1: Client initiates booking ---
    const fakeStripeSessionId = 'cs_test_123';
    (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: fakeStripeSessionId,
      url: 'https://checkout.stripe.com/pay/fake_session',
    });

    const bookingResponse = await clientAgent
      .post('/api/bookings')
      .send({
        serviceId: service.id,
        date: new Date().toISOString(),
      });

    expect(bookingResponse.status).toBe(200);
    expect(bookingResponse.body.url).toBe('https://checkout.stripe.com/pay/fake_session');
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
        payment_intent_data: { capture_method: 'manual' }
    }));

    // --- Step 2: Simulate Stripe redirect to verify payment ---
    const fakePaymentIntentId = 'pi_test_123';
    const sessionFromStripe = {
        id: fakeStripeSessionId,
        status: 'complete',
        payment_intent: fakePaymentIntentId,
        metadata: (mockStripe.checkout.sessions.create as jest.Mock).mock.calls[0][0].metadata,
    };
    (mockStripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue(sessionFromStripe);

    const verifyResponse = await clientAgent
        .get(`/api/verify-payment?session_id=${fakeStripeSessionId}`);
    
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.success).toBe(true);
    
    const bookings: Booking[] = JSON.parse(mockFiles['data/bookings.json']);
    expect(bookings).toHaveLength(1);
    const theBooking = bookings[0];
    expect(theBooking.status).toBe('pending');
    expect(theBooking.paymentStatus).toBe('authorized');
    expect(theBooking.paymentIntentId).toBe(fakePaymentIntentId);

    // --- Step 3: Provider completes the service ---
    (mockStripe.paymentIntents.capture as jest.Mock).mockResolvedValue({ id: fakePaymentIntentId, status: 'succeeded' });
    (mockStripe.transfers.create as jest.Mock).mockResolvedValue({ id: 'tr_test_123' });

    // Note: supertest can't upload a real file without a real file path, 
    // so we use a buffer.
    const completeResponse = await providerAgent
        .post(`/api/bookings/${theBooking.id}/complete`)
        .attach('photo', Buffer.from('fake image data'), 'test.jpg');

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.status).toBe('completed');
    expect(completeResponse.body.paymentStatus).toBe('released');
    expect(completeResponse.body.photoProof).toContain('/uploads/photo-');

    // --- Step 4: Verify Stripe calls ---
    expect(mockStripe.paymentIntents.capture).toHaveBeenCalledWith(fakePaymentIntentId);
    // This part of the logic is currently commented out in server.ts unless the user has a stripeAccountId
    // so we check if it was called or not. A more advanced test would set a stripeAccountId on the provider.
    // For now, we confirm it was NOT called.
    expect(mockStripe.transfers.create).not.toHaveBeenCalled();
  });
});
