import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from './supabase/server';

export interface CurrentUser {
  id: string;
  email: string | null;
  displayName: string;
  avatarEmoji: string;
}

/**
 * Data Access Layer: o único lugar que lê a sessão. Valida o JWT (getClaims) e busca o
 * perfil sob RLS. Sem sessão, manda para o login. `cache` evita repetir a leitura na
 * mesma requisição.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_emoji')
    .eq('id', claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : null,
    // Sem perfil (ex.: trigger ainda não aplicado no projeto), mostra algo útil em vez de quebrar.
    displayName: profile?.display_name ?? 'Jogador',
    avatarEmoji: profile?.avatar_emoji ?? '🙂',
  };
});
