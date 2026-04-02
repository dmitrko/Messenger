import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './', // Root-relative for local file loading in Electron
    server: {
        port: 5173,
        strictPort: true, // Fail if port 5173 is in use
    },
    define: {
        global: 'window',
        'process.env': {},
    }
});
