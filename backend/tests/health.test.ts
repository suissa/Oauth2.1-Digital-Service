import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import axios from 'axios';
import { server as app } from '../src/server'; // Import the server instance

const legacyApiUrl = 'http://api.legado.com';
process.env.LEGACY_API_URL = `${legacyApiUrl}/login`;

describe('Health Check Endpoint', () => {
  let mongoServer: MongoMemoryServer;
  let server: FastifyInstance = app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    await mongoose.connect(mongoUri);
    await server.ready();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    await server.close();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve retornar 200 e status "healthy" quando tudo está OK', async () => {
    const axiosSpy = vi.spyOn(axios, 'get').mockResolvedValue({ status: 200 });

    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('OK');
    expect(body.checks[0].status).toBe('healthy');
    expect(body.checks[1].status).toBe('healthy');
    expect(axiosSpy).toHaveBeenCalledWith(legacyApiUrl, { timeout: 5000 });
  });

  it('deve retornar 503 quando a conexão com o MongoDB falhar', async () => {
    await mongoose.disconnect();

    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Service Unavailable');
    expect(body.checks[0].status).toBe('unhealthy');

    // Reconecta para os próximos testes
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  it('deve retornar 503 quando a API legada está indisponível', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Network Error'));

    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Service Unavailable');
    expect(body.checks[1].status).toBe('unhealthy');
  });

  it('deve retornar 503 quando a URL da API legada não está configurada', async () => {
    const originalUrl = process.env.LEGACY_API_URL;
    delete process.env.LEGACY_API_URL;

    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Service Unavailable');
    expect(body.checks[1].status).toBe('unavailable');

    process.env.LEGACY_API_URL = originalUrl;
  });
});
