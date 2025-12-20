import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    splitting: false,
  },
  {
    entry: { browser: 'src/index.ts' },
    format: ['esm'],
    platform: 'browser',
    dts: false,
    sourcemap: true,
    treeshake: true,
    splitting: false,
  },
]);
