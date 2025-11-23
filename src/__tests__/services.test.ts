import request from 'supertest';
import { httpServer, io } from '../server';
import fs from 'fs';
import { Service, User } from '../types';

// Mock the file system
let mockFiles: { [key: string]: string } = {};
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: (path: string) => mockFiles[path] !== undefined,
  readFileSync: (path: string) => mockFiles[path] || '[]',
  writeFileSync: jest.fn((path: string, data: string) => {
    mockFiles[path] = data;
  }),
}));

describe('Service Endpoints', () => {
  let providerAgent: request.SuperAgentTest;
  let clientAgent: request.SuperAgentTest;
  let providerUser: Partial<User>;

  beforeEach(async () => {
    // Reset mock file system
    mockFiles = {
      'data/users.json': '[]',
      'data/services.json': '[]',
      'data/bookings.json': '[]',
    };
    (fs.writeFileSync as jest.Mock).mockClear();

    // Create a client user/agent
    clientAgent = request.agent(httpServer);
    await clientAgent.post('/api/register').send({
        email: 'client@example.com',
        password: 'password123',
        acceptedTerms: true,
    });

    // Create a provider user/agent
    providerAgent = request.agent(httpServer);
    const registerRes = await providerAgent.post('/api/register').send({
      email: 'provider@example.com',
      password: 'password123',
      acceptedTerms: true,
    });

    // Become a provider
    await providerAgent.post('/api/become-provider').send({
        acceptedProviderTerms: true
    });

    // We need the user ID for some assertions later
    const users: User[] = JSON.parse(mockFiles['data/users.json'] || '[]');
    providerUser = users.find(u => u.email === 'provider@example.com');
  });

  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  describe('POST /api/services', () => {
    it('should allow a provider to create a new service', async () => {
      const response = await providerAgent
        .post('/api/services')
        .send({
          title: 'Professional House Cleaning',
          description: 'A very detailed description of the cleaning service.',
          price: 99.99,
          address: '123 Main St, Anytown, USA'
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Professional House Cleaning');
      expect(response.body.providerId).toBe(providerUser.id);

      // Verify it was saved
      const services: Service[] = JSON.parse(mockFiles['data/services.json']);
      expect(services).toHaveLength(1);
      expect(services[0].title).toBe('Professional House Cleaning');
    });

    it('should not allow a client to create a service', async () => {
        const response = await clientAgent
          .post('/api/services')
          .send({
            title: 'I am a client trying to make a service',
            description: 'This should not work.',
            price: 10,
          });
  
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Only providers can create services');
    });

    it('should fail if the title is too short', async () => {
        const response = await providerAgent
          .post('/api/services')
          .send({
            title: 'A',
            description: 'A valid description.',
            price: 10,
          });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].msg).toContain('Title must be between 3 and 200 characters');
    });
  });

  describe('GET /api/services', () => {
    it('should return a list of all available services to anyone', async () => {
        // First, create a service as the provider
        await providerAgent
            .post('/api/services')
            .send({
                title: 'Test Service',
                description: 'A service for testing.',
                price: 50
            });

        // Then, get the list of services as a simple unauthenticated user
        const response = await request(httpServer).get('/api/services');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].title).toBe('Test Service');
    });
  });

  describe('GET /api/my-services', () => {
    it("should return only the provider's own services", async () => {
        // Create a service
        await providerAgent
            .post('/api/services')
            .send({
                title: 'My Own Service',
                description: 'This is mine.',
                price: 50
            });
        
        // As the provider, get my-services
        const response = await providerAgent.get('/api/my-services');
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].title).toBe('My Own Service');

        // As a different user (client), try to get my-services
        // It should return an empty array as the client has not created any services.
        // It should not error, but instead return what a provider with no services would see.
        const clientResponse = await clientAgent.get('/api/my-services');
        expect(clientResponse.status).toBe(403); // Or it could be an empty array if the endpoint is permissive
        expect(clientResponse.body.error).toBe('Only providers can access this');
    });
  });
});
