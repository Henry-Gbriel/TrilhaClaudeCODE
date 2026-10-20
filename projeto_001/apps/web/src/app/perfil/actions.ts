'use server';

import { profileUpdateSchema } from '@devquiz/shared';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface ProfileFormState {
  error: string | null;
}

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileUpdateSchema.safeParse({
    displayName: formData.get('displayName'),
    avatarEmoji: formData.get('avatarEmoji'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  // Server Function é um endpoint público: confere a sessão aqui, não só no proxy.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect('/login?next=/perfil');

  // A RLS garante que só o próprio perfil é alterado; o filtro deixa a intenção explícita.
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.data.displayName, avatar_emoji: parsed.data.avatarEmoji })
    .eq('id', data.claims.sub);
  if (error) return { error: 'Não foi possível salvar o perfil. Tente de novo.' };

  redirect('/');
}
