import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  // Pacotes workspace são TS-fonte: entram no bundle. Dependências npm ficam externas.
  noExternal: [/^@devquiz\//],
});
