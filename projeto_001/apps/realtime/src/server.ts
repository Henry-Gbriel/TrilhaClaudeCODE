import Fastify from 'fastify';
import { Server } from 'socket.io';
import { type AuthUser, bearerToken, UnauthorizedError, type VerifyToken } from './auth.js';
import type { Env } from './env.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Preenchido pelo hook de auth em `/api/*`. */
    user: AuthUser | null;
  }
}

export interface SocketData {
  user: AuthUser;
}

interface ServerDeps {
  verifyToken: VerifyToken;
}

export function buildServer(env: Env, { verifyToken }: ServerDeps) {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: 'info' },
  });

  app.get('/health', () => ({ status: 'ok', uptime: process.uptime() }));

  // Toda rota da API exige o access_token do Supabase no header Authorization.
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return;
    const token = bearerToken(request.headers.authorization);
    try {
      if (token === null) throw new UnauthorizedError();
      request.user = await verifyToken(token);
    } catch {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
  });

  const io = new Server<
    Record<string, never>,
    Record<string, never>,
    Record<string, never>,
    SocketData
  >(app.server, {
    // Auth vai pelo token no handshake (não por cookie), então não precisa de credentials.
    cors: { origin: env.WEB_ORIGIN },
  });

  // Handshake: `auth: { token }`. Sem token válido, a conexão é recusada com UNAUTHORIZED.
  io.use((socket, next) => {
    const token: unknown = (socket.handshake.auth as Record<string, unknown>).token;
    if (typeof token !== 'string' || token === '') {
      next(new UnauthorizedError());
      return;
    }
    verifyToken(token).then(
      (user) => {
        socket.data.user = user;
        next();
      },
      () => {
        next(new UnauthorizedError());
      },
    );
  });

  io.on('connection', (socket) => {
    app.log.info({ socketId: socket.id, userId: socket.data.user.id }, 'socket conectado');
    socket.on('disconnect', (reason) => {
      app.log.info({ socketId: socket.id, reason }, 'socket desconectado');
    });
  });

  app.addHook('onClose', async () => {
    await io.close();
  });

  return { app, io };
}
