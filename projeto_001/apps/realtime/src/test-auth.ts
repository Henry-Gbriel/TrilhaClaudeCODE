// Helpers de teste: um "Supabase Auth" local, com par de chaves ES256 próprio e sem rede.
import { generateKeyPair, SignJWT } from 'jose';
import { createTokenVerifier } from './auth.js';

export const TEST_ISSUER = 'https://test.supabase.co/auth/v1';

type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;

export async function createTestAuth() {
  const keys: KeyPair = await generateKeyPair('ES256');
  const verifyToken = createTokenVerifier({ getKey: () => keys.publicKey, issuer: TEST_ISSUER });

  /** Assina um access_token no formato do Supabase. `overrides` muda claims ou a chave. */
  async function sign(
    overrides: {
      sub?: string | null;
      email?: string;
      issuer?: string;
      audience?: string;
      expiresIn?: string | number;
      privateKey?: KeyPair['privateKey'];
    } = {},
  ): Promise<string> {
    const jwt = new SignJWT({ email: overrides.email ?? 'ana@example.com', role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuer(overrides.issuer ?? TEST_ISSUER)
      .setAudience(overrides.audience ?? 'authenticated')
      .setIssuedAt()
      .setExpirationTime(overrides.expiresIn ?? '1h');
    if (overrides.sub !== null)
      jwt.setSubject(overrides.sub ?? '00000000-0000-0000-0000-00000000000a');
    return jwt.sign(overrides.privateKey ?? keys.privateKey);
  }

  return { verifyToken, sign };
}
