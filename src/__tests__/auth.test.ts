import request from 'supertest';
import { httpServer, io } from '../server';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { User } from '../types';

// This is a mock in-memory store for our fake file system
let mockFiles: { [key: string]: string } = {};

// We mock the 'fs' module to prevent tests from writing to disk
// and to control the data source for our server.
jest.mock('fs', () => ({
  ...jest.requireActual('fs'), // Use actual fs for everything else
  existsSync: (path: string) => mockFiles[path] !== undefined,
  readFileSync: (path: string, _options: any) => {
    return mockFiles[path] || '[]'; // Return empty array if file doesn't exist in mock
  },
  writeFileSync: jest.fn((path: string, data: string) => {
    // When the server tries to write data, we store it in our in-memory mock
    mockFiles[path] = data;
  }),
}));

describe('Authentication Endpoints', () => {
  // Before each test, we reset the mock file system to a clean state.
  // This ensures that tests are isolated from each other.
  beforeEach(() => {
    mockFiles = {
      'data/users.json': '[]',
      'data/services.json': '[]',
      'data/bookings.json': '[]',
      'data/chatMessages.json': '[]',
      'data/notifications.json': '[]',
      'data/reviews.json': '[]',
    };
    // Also, we must clear any previous mock calls' history
    (fs.writeFileSync as jest.Mock).mockClear();
  });

  // Close server connection after all tests
  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  describe('POST /api/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(httpServer)
        .post('/api/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          acceptedTerms: true,
        });

      // 1. Check the HTTP response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.userType).toBe('client');
      // Check for the authentication cookie
      expect(response.headers['set-cookie'][0]).toContain('token=');

      // 2. Check if the user was "saved" to our mock file system
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'data/users.json',
        expect.any(String)
      );
      
      const users: User[] = JSON.parse(mockFiles['data/users.json']);
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('test@example.com');
    });

    it('should fail if user already exists', async () => {
        // First, create a user
        const hashedPassword = await bcrypt.hash('password123', 12);
        const existingUser: User = {
            id: '1',
            email: 'test@example.com',
            password: hashedPassword,
            userType: 'client',
            isClient: true,
            isProvider: false,
            acceptedTerms: true,
            createdAt: new Date().toISOString(),
        };
        mockFiles['data/users.json'] = JSON.stringify([existingUser]);

        // Then, try to register with the same email
        const response = await request(httpServer)
            .post('/api/register')
            .send({
                email: 'test@example.com',
                password: 'password456',
                acceptedTerms: true,
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('User already exists');
    });

    it('should fail if terms are not accepted', async () => {
        const response = await request(httpServer)
            .post('/api/register')
            .send({
                email: 'test@example.com',
                password: 'password123',
                acceptedTerms: false,
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('You must accept the Terms & Conditions');
    });

    it('should fail with a short password', async () => {
        const response = await request(httpServer)
            .post('/api/register')
            .send({
                email: 'test@example.com',
                password: '123',
                acceptedTerms: true,
            });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].msg).toBe('Password must be at least 8 characters');
    });
  });

  describe('POST /api/login', () => {
    let existingUser: User;
    
    beforeEach(async () => {
        const hashedPassword = await bcrypt.hash('password123', 12);
        existingUser = {
            id: '1',
            email: 'test@example.com',
            password: hashedPassword,
            userType: 'client',
            isClient: true,
            isProvider: false,
            acceptedTerms: true,
            createdAt: new Date().toISOString(),
        };
        // Seed the mock database with a user
        mockFiles['data/users.json'] = JSON.stringify([existingUser]);
    });

    it('should login an existing user successfully', async () => {
        const response = await request(httpServer)
            .post('/api/login')
            .send({
                email: 'test@example.com',
                password: 'password123',
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.headers['set-cookie'][0]).toContain('token=');
    });

    it('should fail with incorrect password', async () => {
        const response = await request(httpServer)
            .post('/api/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword',
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail for a non-existent user', async () => {
        const response = await request(httpServer)
            .post('/api/login')
            .send({
                email: 'nouser@example.com',
                password: 'password123',
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('Authenticated Routes', () => {
    let agent: request.SuperAgentTest;

    beforeEach(async () => {
        // Create a test agent that will maintain cookies
        agent = request.agent(httpServer);

        // Register a user first
        await agent
            .post('/api/register')
            .send({
                email: 'authtest@example.com',
                password: 'password123',
                acceptedTerms: true,
            });
    });

    it('GET /api/me should return user data for an authenticated user', async () => {
        const response = await agent.get('/api/me');

        expect(response.status).toBe(200);
        expect(response.body.email).toBe('authtest@example.com');
        expect(response.body.userType).toBe('client');
    });

    it('GET /api/me should fail for an unauthenticated user', async () => {
        // Use a new, unauthenticated agent
        const unauthenticatedAgent = request.agent(httpServer);
        const response = await unauthenticatedAgent.get('/api/me');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Authentication required');
    });

    it('POST /api/logout should clear the auth token', async () => {
        // First, ensure we are logged in
        const meResponse = await agent.get('/api/me');
        expect(meResponse.status).toBe(200);

        // Then, logout
        const logoutResponse = await agent.post('/api/logout');
        expect(logoutResponse.status).toBe(200);
        expect(logoutResponse.body.success).toBe(true);
        // Check that the cookie has been cleared
        expect(logoutResponse.headers['set-cookie'][0]).toContain('token=;');

        // Finally, verify we are no longer authenticated
        const finalMeResponse = await agent.get('/api/me');
        expect(finalMeResponse.status).toBe(401);
    });

    it('DELETE /api/me should delete the user account', async () => {
        const deleteResponse = await agent.delete('/api/me');
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.success).toBe(true);

        // Verify the user can no longer log in
        const loginResponse = await agent
            .post('/api/login')
            .send({
                email: 'authtest@example.com',
                password: 'password123'
            });
        
        // The user is deleted, so the login should fail
        // Note: in the current implementation, users are found by email. 
        // Since the user array is now empty, it will result in 'Invalid credentials'.
        const users: User[] = JSON.parse(mockFiles['data/users.json']);
        expect(users.find(u => u.email === 'authtest@example.com')).toBeUndefined();
    });
  });
});
