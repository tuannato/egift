import { defineConfig } from 'vitest/config';

export default defineConfig({
    server: { port: 5183, strictPort: true },
    preview: { port: 5184, strictPort: true },
    build: { target: 'es2022', sourcemap: false },
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.ts'],
        testTimeout: 20000,
    },
});
