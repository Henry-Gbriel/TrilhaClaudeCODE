import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  REALTIME_PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  SUPABASE_URL: z.url().optional(),
  // Secret key (substitui a antiga service_role): ignora RLS, só no servidor. Opcional até o M2/M3.
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_').optional(),
  // Chaves públicas para validar o JWT do Supabase Auth (M3).
  SUPABASE_JWKS_URL: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Variáveis vazias vindas do .env contam como ausentes.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
  return envSchema.parse(cleaned);
}
