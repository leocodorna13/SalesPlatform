// Endpoint para salvar assinaturas de notificações
import { saveSubscription } from '../../services/pushNotifications';

export async function POST({ request }) {
  try {
    const subscription = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ success: false, error: 'Assinatura inválida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const success = await saveSubscription(subscription);
    
    return new Response(JSON.stringify({ success }), {
      status: success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao processar assinatura:', error);
    
    return new Response(JSON.stringify({ success: false, error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
