import { supabase } from '../../services/supabase';

export async function get({ request }) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const excludeIds = url.searchParams.get('exclude')?.split(',').filter(Boolean) || [];
    const perPage = 8;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories (
          *
        ),
        product_images (
          *
        )
      `)
      .eq('status', 'available')
      .eq('visible', true)
      .order('created_at', { ascending: false });

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', excludeIds);
    }

    const { data, error } = await query.range(from, to);
    
    if (error) throw error;
    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
