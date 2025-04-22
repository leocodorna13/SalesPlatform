// Serviço para enviar notificações push
import webpush from 'web-push';
import { supabase } from '../services/supabase';

// Configurar web-push com as chaves VAPID
const vapidPublicKey = import.meta.env.VAPID_PUBLIC_KEY || 
  'BAG0zdDLenMECfMFnl8gfQo2YHhdzE_BHS5rUHc8YdL2NWLXoLR43MkS4aDaKzL9R44FBQrKRG4R_sc-iX_BLvA';
const vapidPrivateKey = import.meta.env.VAPID_PRIVATE_KEY || 
  '1hqis43lASFsovO1KRvE0viNNpW5VWbYo-e22KbuNH0';
const vapidSubject = import.meta.env.VAPID_SUBJECT || 
  'mailto:contato@exemplo.com';

webpush.setVapidDetails(
  vapidSubject,
  vapidPublicKey,
  vapidPrivateKey
);

/**
 * Busca todas as assinaturas de notificação do banco de dados
 */
export async function getAllSubscriptions() {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*');
      
    if (error) {
      console.error('Erro ao buscar assinaturas:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error);
    return [];
  }
}

/**
 * Envia uma notificação para um endpoint específico
 */
export async function sendNotificationToSubscription(subscription, payload) {
  try {
    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      },
      JSON.stringify(payload)
    );
    
    return {
      success: true,
      statusCode: result.statusCode
    };
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    
    // Se o erro for 410 (Gone) ou 404 (Not Found), a assinatura não é mais válida
    if (error.statusCode === 410 || error.statusCode === 404) {
      try {
        // Remover a assinatura do banco de dados
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
          
        console.log('Assinatura inválida removida:', subscription.endpoint);
      } catch (dbError) {
        console.error('Erro ao remover assinatura inválida:', dbError);
      }
    }
    
    return {
      success: false,
      statusCode: error.statusCode,
      message: error.message
    };
  }
}

/**
 * Envia uma notificação para todas as assinaturas registradas
 */
export async function sendNotificationToAll(title, body, url = '/') {
  try {
    const subscriptions = await getAllSubscriptions();
    
    if (subscriptions.length === 0) {
      return {
        success: false,
        message: 'Nenhuma assinatura encontrada'
      };
    }
    
    const payload = {
      title,
      body,
      url,
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      timestamp: Date.now()
    };
    
    const results = await Promise.all(
      subscriptions.map(subscription => 
        sendNotificationToSubscription(subscription, payload)
      )
    );
    
    const successCount = results.filter(result => result.success).length;
    
    return {
      success: true,
      total: subscriptions.length,
      sent: successCount,
      failed: subscriptions.length - successCount
    };
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
    return {
      success: false,
      message: error.message
    };
  }
}
