import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  integrations: [tailwind()],
  output: 'server', // Necessário para funcionalidades dinâmicas com Supabase
  adapter: cloudflare({
    mode: 'directory',
    functionPerRoute: true,
    imageService: true,
  }),
});
