// Endpoint para obter a sessão atual
import { supabase } from '../../../services/supabase';

export async function GET({ request, cookies }) {
  try {
    // Verificar a sessão atual
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Erro ao obter sessão',
        session: null
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      session: data.session
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao processar solicitação de sessão:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Erro interno do servidor',
      session: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
