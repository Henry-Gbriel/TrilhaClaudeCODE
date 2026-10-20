import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';

// Rotas abertas: o login e o retorno do OAuth.
const PUBLIC_PATHS = ['/login', '/auth/'];

/**
 * Renova a sessão do Supabase a cada navegação (o access_token dura 1 h) e manda quem não está
 * logado para o login. É só uma checagem otimista: páginas e Server Functions validam de novo.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Cache-Control: private/no-store, para nenhum proxy cachear a sessão de alguém.
        for (const [header, value] of Object.entries(headers)) response.headers.set(header, value);
      },
    },
  });

  // getClaims valida o JWT (pelas chaves públicas do projeto) e renova a sessão se preciso.
  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));

  if (!data?.claims && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = '';
    login.searchParams.set('next', pathname + search);
    const redirect = NextResponse.redirect(login);
    // Preserva cookies limpos/renovados pelo getClaims.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Tudo, menos assets do Next, imagens, favicon e o health check.
    '/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
