import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

const monorepoRoot = path.join(__dirname, '../..');

// O .env fica na raiz do monorepo (compartilhado com o realtime e o docker compose).
// forceReload: o Next já chamou loadEnvConfig para apps/web, e sem ele a chamada devolve o cache.
loadEnvConfig(monorepoRoot, process.env.NODE_ENV !== 'production', console, true);

// O Next recarrega o process.env a partir do próprio snapshot (que não conhece o .env da raiz),
// então as NEXT_PUBLIC_* lidas aqui são repassadas via `env`, que ele embute no bundle.
const publicEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[0].startsWith('NEXT_PUBLIC_') && !!entry[1],
  ),
);

const nextConfig: NextConfig = {
  env: publicEnv,
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  // Pacotes workspace são consumidos como TS-fonte.
  transpilePackages: ['@devquiz/shared', '@devquiz/game-engine'],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: monorepoRoot,
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
