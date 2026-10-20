import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import type { Env } from './env.js';

/** Usuário autenticado, extraído de um access_token válido do Supabase Auth. */
export interface AuthUser {
  id: string;
  email: string | null;
}

export type VerifyToken = (token: string) => Promise<AuthUser>;

/** Erro único para qualquer falha de auth: o cliente não precisa (nem deve) saber o motivo. */
export class UnauthorizedError extends Error {
  constructor(cause?: unknown) {
    super('UNAUTHORIZED', { cause });
    this.name = 'UnauthorizedError';
  }
}

interface VerifierOptions {
  /** Busca a chave pública: `createRemoteJWKSet` em produção, `() => publicKey` nos testes. */
  getKey: JWTVerifyGetKey;
  /** `${SUPABASE_URL}/auth/v1`. */
  issuer: string;
}

export function createTokenVerifier({ getKey, issuer }: VerifierOptions): VerifyToken {
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, getKey, {
        issuer,
        audience: 'authenticated',
        // Supabase assina com chaves assimétricas (ES256 hoje). HS256 fica de fora: exigiria o segredo.
        algorithms: ['ES256', 'RS256'],
      });
      if (typeof payload.sub !== 'string' || payload.sub === '') {
        throw new Error('token sem sub');
      }
      const email =
        typeof payload.email === 'string' && payload.email !== '' ? payload.email : null;
      return { id: payload.sub, email };
    } catch (err) {
      throw new UnauthorizedError(err);
    }
  };
}

/** Verifier de produção, a partir do JWKS do projeto. Falha cedo se a config estiver faltando. */
export function verifierFromEnv(env: Env): VerifyToken {
  if (env.SUPABASE_URL === undefined || env.SUPABASE_JWKS_URL === undefined) {
    throw new Error('SUPABASE_URL e SUPABASE_JWKS_URL são obrigatórias para validar o login.');
  }
  return createTokenVerifier({
    getKey: createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL)),
    issuer: `${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1`,
  });
}

/** Extrai o token de `Authorization: Bearer <token>`. */
export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer (\S+)$/i.exec(header ?? '');
  return match?.[1] ?? null;
}
