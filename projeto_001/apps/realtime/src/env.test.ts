import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('aplica os defaults quando nada é informado', () => {
    expect(loadEnv({})).toMatchObject({
      NODE_ENV: 'development',
      REALTIME_PORT: 4000,
      HOST: '0.0.0.0',
      WEB_ORIGIN: 'http://localhost:3000',
    });
  });

  it('trata valor vazio do .env como ausente', () => {
    const env = loadEnv({ SUPABASE_URL: '', SUPABASE_SECRET_KEY: '', REALTIME_PORT: '' });
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_SECRET_KEY).toBeUndefined();
    expect(env.REALTIME_PORT).toBe(4000);
  });

  it('converte a porta para número', () => {
    expect(loadEnv({ REALTIME_PORT: '4100' }).REALTIME_PORT).toBe(4100);
  });

  it('rejeita secret key fora do formato sb_secret_', () => {
    expect(() => loadEnv({ SUPABASE_SECRET_KEY: 'eyJhbGciOi-legacy-service-role' })).toThrow();
    expect(loadEnv({ SUPABASE_SECRET_KEY: 'sb_secret_abc' }).SUPABASE_SECRET_KEY).toBe(
      'sb_secret_abc',
    );
  });

  it('rejeita URL inválida', () => {
    expect(() => loadEnv({ SUPABASE_URL: 'nao-e-url' })).toThrow();
  });
});
