import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';
import { buildServer } from './server.js';

describe('realtime server', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildServer(loadEnv({ NODE_ENV: 'test' })).app;
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health responde ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('cada teste recebe uma instância nova', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });
});
