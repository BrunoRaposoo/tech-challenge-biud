import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@repo/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
