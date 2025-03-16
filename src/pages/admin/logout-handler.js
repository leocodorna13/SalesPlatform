import { logout } from '../../services/supabase';

export const prerender = false;

export async function POST() {
  try {
    const success = await logout();
    
    if (success) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Falha ao fazer logout' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
