import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
            manifest: {
                id: '/',
                prefer_related_applications: false,
                categories: ['finance', 'productivity', 'utilities'],
                name: 'Finance Tracker',
                short_name: 'Finance',
                description: 'Personal finance tracker with premium design',
                theme_color: '#1a1a2e',
                background_color: '#1a1a2e',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'pwa-192x192.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml'
                    },
                    {
                        src: 'pwa-512x512.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml'
                    },
                    {
                        src: 'pwa-512x512.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    server: {
        port: 5173,
        proxy: {
            '/auth': 'http://localhost:3001',
            '/me': 'http://localhost:3001',
            '/categories': 'http://localhost:3001',
            '/groups': 'http://localhost:3001',
            '/payment-methods': 'http://localhost:3001',
            '/income-sources': 'http://localhost:3001',
            '/lending': 'http://localhost:3001',
            // Proxy /transactions API calls but not the frontend route
            '/transactions': {
                target: 'http://localhost:3001',
                bypass: (req) => {
                    // If it's a browser navigation (Accept: text/html), serve frontend
                    if (req.headers.accept?.includes('text/html')) {
                        return req.url;
                    }
                    // Otherwise proxy to backend API
                    return null;
                }
            },
        }
    },
    build: {
        outDir: 'dist',
    }
})
