import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        include: ['assets/tests/**/*Tests.js'],
        setupFiles: ['assets/tests/setup.js']
    }
});
