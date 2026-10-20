import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@devquiz/shared';
import { cookies } from 'next/headers';
import { supabaseConfig } from './config';

/** Cliente por requisição (Server Components, Server Functions e Route Handlers). */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseConfig();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components não podem gravar cookies; o proxy já renovou a sessão.
        }
      },
    },
  });
}
