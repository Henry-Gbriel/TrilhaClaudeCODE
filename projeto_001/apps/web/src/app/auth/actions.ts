'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeNextPath } from '@/lib/safe-next';
import { createClient } from '@/lib/supabase/server';

const PROVIDERS = ['github', 'google'] as const;
type Provider = (typeof PROVIDERS)[number];

function isProvider(value: unknown): value is Provider {
  return PROVIDERS.includes(value as Provider);
}

/** Origem pública do site: funciona em localhost:3000 e atrás do Caddy (https://localhost). */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get('origin');
  if (origin) return origin;
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export async function signInWithProvider(formData: FormData) {
  const provider = formData.get('provider');
  if (!isProvider(provider)) redirect('/login?erro=provedor');

  const next = safeNextPath(formData.get('next')?.toString());
  const callback = new URL('/auth/callback', await siteOrigin());
  callback.searchParams.set('next', next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  });
  if (error) redirect('/login?erro=oauth');
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
