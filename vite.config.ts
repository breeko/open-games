import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/** Independent pages prevent one game's engine, styles or timers leaking into another. */
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        library: fileURLToPath(new URL('./index.html', import.meta.url)),
        'garden-guard': fileURLToPath(new URL('./games/garden-guard/index.html', import.meta.url)),
      },
    },
  },
});
