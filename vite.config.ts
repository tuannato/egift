import { defineConfig } from 'vitest/config';

export default defineConfig({
    server: { port: 5183, strictPort: true },
    preview: { port: 5184, strictPort: true },
    build: {
        target: 'es2022',
        sourcemap: false,
        rollupOptions: {
            output: {
                // The signing library's compiled core (one long block that does not compress, most of what a gift's
                // recipient fetches) goes into a file of its own: it changes only when the library does, so a release
                // that changes the page's own code does not make a visitor fetch it again. Only that one module is
                // named: it depends on nothing, so nothing the shop needs follows it out of the shop's files.
                manualChunks: id => (id.endsWith('/ecash-lib/dist/ffi/ecash_lib_wasm_bg_browser.js') ? 'signing' : undefined),
            },
        },
    },
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.ts'],
        testTimeout: 20000,
    },
});
