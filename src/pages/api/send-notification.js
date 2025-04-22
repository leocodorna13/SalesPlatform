// Endpoint para enviar notificações
import { getAllSubscriptions } from '../../services/pushNotifications';
import { supabase } from '../../services/supabase';

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
    // Verificar autenticação
    const authenticated = await isAuthenticated(request);
    if (!authenticated) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { title, body, url } = await request.json();
    
    if (!title || !body) {
      return new Response(JSON.stringify({ success: false, error: 'Parâmetros inválidos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const subscriptions = await getAllSubscriptions();
    
    if (!subscriptions.length) {
      return new Response(JSON.stringify({ success: false, error: 'Nenhuma assinatura encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Normalmente, aqui você enviaria as notificações usando web-push
    // Para fins de demonstração, apenas logamos o que seria enviado
    console.log(`Enviando notificação: ${title} para ${subscriptions.length} dispositivos`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Notificação enviada para ${subscriptions.length} dispositivos`,
      demo: true
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
