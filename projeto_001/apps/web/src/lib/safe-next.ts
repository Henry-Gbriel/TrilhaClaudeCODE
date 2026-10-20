/**
 * Destino pós-login vindo da URL (`?next=`). Só aceita caminho interno, para que um link
 * malicioso não use o login para redirecionar a vítima a outro site (open redirect).
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next?.startsWith('/')) return fallback;
  // `//host` e `/\host` são tratados pelo navegador como outra origem.
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback;
  // Caracteres de controle (ex.: `/\t/evil.com`) também viram outra origem em alguns navegadores.
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  return next;
}
