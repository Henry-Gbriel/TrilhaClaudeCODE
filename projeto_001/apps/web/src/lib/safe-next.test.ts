import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it.each(['/', '/perfil', '/sala/1234?x=1#y'])('aceita caminho interno %j', (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    null,
    undefined,
    '',
    'perfil',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/a\\b',
    'javascript:alert(1)',
  ])('troca %j pelo fallback', (next) => {
    expect(safeNextPath(next)).toBe('/');
    expect(safeNextPath(next, '/login')).toBe('/login');
  });
});
