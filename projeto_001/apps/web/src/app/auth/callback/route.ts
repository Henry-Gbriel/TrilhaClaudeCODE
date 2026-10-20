import { type NextRequest, NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/safe-next';
import { createClient } from '@/lib/supabase/server';

/** Retorno do OAuth: troca o `code` (PKCE) pela sessão, gravada em cookies. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin));
  }

  return NextResponse.redirect(new URL('/login?erro=callback', request.nextUrl.origin));
}
