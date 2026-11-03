import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { allowedHosts: ['terminal.local'] },
  build: { target: 'es2023', sourcemap: false },
  test: { environment: 'node', include: ['tests/ts/**/*.test.ts'] },
});
