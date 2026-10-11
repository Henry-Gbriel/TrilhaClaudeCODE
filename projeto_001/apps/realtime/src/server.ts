import Fastify from 'fastify';
import { Server } from 'socket.io';
import type { Env } from './env.js';

export function buildServer(env: Env) {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: 'info' },
  });

  app.get('/health', () => ({ status: 'ok', uptime: process.uptime() }));

  const io = new Server(app.server, {
    // Auth vai pelo token no handshake (não por cookie), então não precisa de credentials.
    cors: { origin: env.WEB_ORIGIN },
  });

  // M0: só registra conexões. Validação do JWT no handshake entra no M3.
  io.on('connection', (socket) => {
    app.log.info({ socketId: socket.id }, 'socket conectado');
    socket.on('disconnect', (reason) => {
      app.log.info({ socketId: socket.id, reason }, 'socket desconectado');
    });
  });

  app.addHook('onClose', async () => {
    await io.close();
  });

  return { app, io };
}
