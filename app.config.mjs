export default {
    name: 'Desapego dos Martins',
    description: 'Produtos seminovos em ótimo estado',
    pwa: {
      enabled: true,
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Desapego dos Martins',
        short_name: 'Desapego',
        description: 'Produtos seminovos em ótimo estado',
        theme_color: '#b37847',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/',
        globPatterns: ['**/*.{css,js,html,svg,png,ico,jpg,jpeg,webp}']
      }
    }
  };