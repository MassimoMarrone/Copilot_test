import request from 'supertest';
import { httpServer, io } from '../server'; // Import the exported server

// Close the server and socket.io connection after all tests are done
afterAll((done) => {
  io.close();
  httpServer.close(done);
});

describe('API Endpoints', () => {
  // Test a simple, public endpoint
  it('GET /api/services should return a list of services', async () => {
    const response = await request(httpServer).get('/api/services');
    
    expect(response.status).toBe(200);
    expect(response.type).toBe('application/json');
    // The body should be an array (it can be empty if there are no services)
    expect(Array.isArray(response.body)).toBe(true);
  });
});
