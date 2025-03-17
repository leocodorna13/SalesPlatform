import { getProducts, getProductsByCategory, searchProducts } from '../../services/supabase.js';

export async function get({ request }) {
  try {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search');
    const categoryId = url.searchParams.get('category');
    
    let products = [];
    
    // Se tiver query de busca, usamos a função de busca
    if (searchQuery) {
      products = await searchProducts(searchQuery, categoryId);
    } 
    // Se tiver apenas categoria, filtramos por categoria
    else if (categoryId && categoryId !== 'all') {
      products = await getProductsByCategory(categoryId);
    } 
    // Caso contrário, retornamos todos os produtos disponíveis
    else {
      products = await getProducts('available');
    }
    
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Erro na API de produtos:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro ao buscar produtos',
      message: error.message || 'Erro desconhecido'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
