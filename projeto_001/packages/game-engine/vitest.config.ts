import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test-fixtures.ts', 'src/index.ts', 'src/types.ts'],
      // Regras de jogo são o coração do produto: cobertura alta é obrigatória (PRD, M1).
      thresholds: { lines: 95, functions: 95, branches: 90, statements: 95 },
    },
  },
});
