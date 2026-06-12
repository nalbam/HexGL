import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // three.js in its own chunk so game-code changes don't bust its cache
            { name: 'three', test: /node_modules[\\/]three/, priority: 10 },
          ],
        },
      },
    },
  },
});
