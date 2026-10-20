import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@devquiz/shared';
import { supabaseConfig } from './config';

/** Cliente do navegador (Client Components). O @supabase/ssr reaproveita uma instância só. */
export function createClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient<Database>(url, key);
}
