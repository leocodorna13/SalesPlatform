import { removeCarouselImage, getCurrentUser } from '../../services/supabase';

export async function POST({ request }) {
  try {
    // Verificar autenticação
    const user = await getCurrentUser();
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Não autorizado. Faça login para continuar.'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Obter URL da imagem do corpo da requisição
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'URL da imagem não fornecida'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Remover a imagem do carrossel
    const result = await removeCarouselImage(imageUrl);

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erro ao processar requisição: ${error.message}`
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
