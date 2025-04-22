// Serviço para gerenciar notificações push
import { supabase } from './supabase';

// Salvar assinatura no banco de dados
export async function saveSubscription(subscription) {
  try {
    const { endpoint, keys } = subscription;
    
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        },
        { onConflict: 'endpoint' }
      );
      
    if (error) {
      console.error('Erro ao salvar assinatura:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar assinatura:', error);
    return false;
  }
}

// Recuperar todas as assinaturas
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

// Função para converter as chaves VAPID
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
