import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Keep the test resolver consistent with Metro/tsconfig for app-screen imports.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
