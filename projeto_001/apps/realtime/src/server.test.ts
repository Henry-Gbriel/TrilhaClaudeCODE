import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';
import { io as connect, type Socket } from 'socket.io-client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';
import { buildServer } from './server.js';
import { createTestAuth } from './test-auth.js';

let auth: Awaited<ReturnType<typeof createTestAuth>>;

beforeAll(async () => {
  auth = await createTestAuth();
});

describe('realtime server', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildServer(loadEnv({ NODE_ENV: 'test' }), { verifyToken: auth.verifyToken }).app;
    // Rota de exemplo para exercitar o hook de auth de /api/*.
    app.get('/api/eco', (request) => ({ user: request.user }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health responde ok, sem login', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  describe('auth na API HTTP', () => {
    it('responde 401 sem token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/eco' });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'UNAUTHORIZED' });
    });

    it('responde 401 com token inválido', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/eco',
        headers: { authorization: 'Bearer invalido' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('responde 401 também para rota inexistente, sem revelar quais existem', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/nao-existe' });
      expect(res.statusCode).toBe(401);
    });

    it('com token válido, passa e expõe o usuário', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/eco',
        headers: { authorization: `Bearer ${await auth.sign()}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        user: { id: '00000000-0000-0000-0000-00000000000a', email: 'ana@example.com' },
      });
    });
  });

  describe('auth no handshake do Socket.IO', () => {
    let url: string;
    const sockets: Socket[] = [];

    beforeEach(async () => {
      await app.listen({ port: 0, host: '127.0.0.1' });
      url = `http://127.0.0.1:${String((app.server.address() as AddressInfo).port)}`;
    });

    afterEach(() => {
      for (const s of sockets.splice(0)) s.disconnect();
    });

    /** Resolve com 'connected' ou com a mensagem do connect_error. */
    function tryConnect(auth?: Record<string, unknown>): Promise<string> {
      const socket = connect(url, {
        ...(auth === undefined ? {} : { auth }),
        transports: ['websocket'],
        reconnection: false,
      });
      sockets.push(socket);
      return new Promise((resolve) => {
        socket.on('connect', () => {
          resolve('connected');
        });
        socket.on('connect_error', (err) => {
          resolve(err.message);
        });
      });
    }

    it('conecta com token válido', async () => {
      await expect(tryConnect({ token: await auth.sign() })).resolves.toBe('connected');
    });

    it.each([
      ['sem auth', undefined],
      ['sem token', {}],
      ['token que não é string', { token: 123 }],
      ['token inválido', { token: 'invalido' }],
    ])('recusa %s com UNAUTHORIZED', async (_label, handshakeAuth) => {
      await expect(tryConnect(handshakeAuth)).resolves.toBe('UNAUTHORIZED');
    });

    it('recusa token expirado', async () => {
      const token = await auth.sign({ expiresIn: Math.floor(Date.now() / 1000) - 60 });
      await expect(tryConnect({ token })).resolves.toBe('UNAUTHORIZED');
    });
  });
});
