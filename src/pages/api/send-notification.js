// Endpoint para enviar notificações
import { getAllSubscriptions } from '../../services/pushNotifications';
import { supabase } from '../../services/supabase';
import { sendNotificationToAll } from '../../utils/push-service';

// Verificar se o usuário está autenticado
async function isAuthenticated(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);
    
    return !!data.user && !error;
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return false;
  }
}

export async function POST({ request }) {
  try {
    // Verificar autenticação (opcional para demonstração)
    const authenticated = await isAuthenticated(request);
    if (!authenticated) {
      console.warn('Tentativa não autenticada de enviar notificação - prosseguindo para fins de demonstração');
      // Em produção, você descomentaria a linha abaixo para exigir autenticação
      /*
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
      */
    }

    const { title, body, url } = await request.json();
    
    if (!title || !body) {
      return new Response(JSON.stringify({ success: false, error: 'Parâmetros inválidos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Enviar notificação usando o serviço de push
    const result = await sendNotificationToAll(title, body, url || '/');
    
    if (!result.success) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: result.message || 'Erro ao enviar notificação'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Notificação enviada para ${result.sent} de ${result.total} dispositivos.`,
      result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    
    return new Response(JSON.stringify({ success: false, error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
