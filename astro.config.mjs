import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  output: 'server',
  adapter: cloudflare(),
  
  // Configuração de otimização de imagens
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        // Configurações globais para todas as imagens
        quality: 80, // Qualidade padrão de 80%
        format: ['webp', 'avif', 'jpeg'], // Formatos a serem gerados
        includeOriginalFormat: false, // Não incluir o formato original
        defaultDirectives: {
          // Configurações específicas por formato
          webp: {
            quality: 80,
            effort: 4, // Equilíbrio entre velocidade e compressão (0-6)
          },
          avif: {
            quality: 70, // AVIF pode usar qualidade menor mantendo boa aparência
            speed: 5, // Equilíbrio entre velocidade e compressão (0-10)
          },
          jpeg: {
            quality: 85,
            progressive: true, // Carregamento progressivo
          }
        }
      }
    },
    // Tamanhos padrão para imagens responsivas
    deviceSizes: [256, 640, 768, 1024, 1280, 1536],
    // Desativar o redimensionamento remoto para imagens do Supabase (trataremos separadamente)
    domains: ['ebfjtzvwkgnhzstlqjnz.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  }
});
