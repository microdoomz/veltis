import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.test.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    include: ['tests/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
  },
});
