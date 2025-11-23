import request from 'supertest';
import { httpServer } from '../server'; // Import the exported server

describe('API Endpoints', () => {
  const agent = request.agent(httpServer);

  // Test a simple, public endpoint
  it('GET /api/services should return a list of services', async () => {
    const response = await agent.get('/api/services');
    
    expect(response.status).toBe(200);
    expect(response.type).toBe('application/json');
    // The body should be an array (it can be empty if there are no services)
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should return 404 for a non-existent endpoint', async () => {
    const response = await agent.get('/api/non-existent-endpoint');
    expect(response.status).toBe(404);
  });
});
