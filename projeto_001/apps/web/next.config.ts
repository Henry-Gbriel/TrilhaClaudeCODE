import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

const monorepoRoot = path.join(__dirname, '../..');

// O .env fica na raiz do monorepo (compartilhado com o realtime e o docker compose).
loadEnvConfig(monorepoRoot);

const nextConfig: NextConfig = {
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
