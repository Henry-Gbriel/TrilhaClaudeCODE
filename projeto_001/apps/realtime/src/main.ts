import { verifierFromEnv } from './auth.js';
import { loadEnv } from './env.js';
import { buildServer } from './server.js';

const env = loadEnv();
const { app } = buildServer(env, { verifyToken: verifierFromEnv(env) });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.close().then(
      () => process.exit(0),
      (err: unknown) => {
        app.log.error({ err }, 'falha no shutdown');
        process.exit(1);
      },
    );
  });
}

await app.listen({ port: env.REALTIME_PORT, host: env.HOST });
