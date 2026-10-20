import { generateKeyPair, SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { bearerToken, UnauthorizedError, verifierFromEnv } from './auth.js';
import { loadEnv } from './env.js';
import { createTestAuth } from './test-auth.js';

describe('createTokenVerifier', () => {
  let auth: Awaited<ReturnType<typeof createTestAuth>>;

  beforeAll(async () => {
    auth = await createTestAuth();
  });

  it('aceita um access_token válido e devolve id e e-mail', async () => {
    await expect(auth.verifyToken(await auth.sign())).resolves.toEqual({
      id: '00000000-0000-0000-0000-00000000000a',
      email: 'ana@example.com',
    });
  });

  it('e-mail vazio vira null', async () => {
    const user = await auth.verifyToken(await auth.sign({ email: '' }));
    expect(user.email).toBeNull();
  });

  it.each([
    ['expirado', { expiresIn: Math.floor(Date.now() / 1000) - 60 }],
    ['de outro projeto (issuer)', { issuer: 'https://outro.supabase.co/auth/v1' }],
    ['com audience errada', { audience: 'anon' }],
    ['sem sub', { sub: null }],
  ])('rejeita token %s', async (_label, overrides) => {
    await expect(auth.verifyToken(await auth.sign(overrides))).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('rejeita token assinado por outra chave', async () => {
    const other = await generateKeyPair('ES256');
    const token = await auth.sign({ privateKey: other.privateKey });
    await expect(auth.verifyToken(token)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejeita algoritmo fora da lista (HS256)', async () => {
    const secret = new TextEncoder().encode('segredo-de-32-caracteres-no-minimo!!');
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('x')
      .setIssuer('https://test.supabase.co/auth/v1')
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(secret);
    await expect(auth.verifyToken(token)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it.each(['', 'nao-e-jwt', 'a.b.c'])('rejeita token malformado %j', async (token) => {
    await expect(auth.verifyToken(token)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('verifierFromEnv', () => {
  it('exige SUPABASE_URL e SUPABASE_JWKS_URL', () => {
    expect(() => verifierFromEnv(loadEnv({}))).toThrow(/obrigatórias/);
    expect(() =>
      verifierFromEnv(
        loadEnv({
          SUPABASE_URL: 'https://x.supabase.co',
          SUPABASE_JWKS_URL: 'https://x.supabase.co/auth/v1/.well-known/jwks.json',
        }),
      ),
    ).not.toThrow();
  });
});

describe('bearerToken', () => {
  it.each([
    ['Bearer abc', 'abc'],
    ['bearer abc', 'abc'],
    ['Basic abc', null],
    ['Bearer ', null],
    ['Bearer a b', null],
    [undefined, null],
  ])('%j → %j', (header, expected) => {
    expect(bearerToken(header)).toBe(expected);
  });
});
