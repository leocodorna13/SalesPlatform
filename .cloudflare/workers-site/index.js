import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

/**
 * Manipulador de eventos para requisições
 */
addEventListener('fetch', (event) => {
  event.respondWith(handleEvent(event));
});

/**
 * Processa a requisição e retorna a resposta
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function handleEvent(event) {
  try {
    // Tenta obter o asset do KV
    return await getAssetFromKV(event);
  } catch (e) {
    // Se não encontrar o asset, retorna uma página 404
    return new Response('Página não encontrada', { status: 404 });
  }
}
