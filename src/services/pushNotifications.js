// Serviço para gerenciar notificações push
import { supabase } from './supabase';

// Salvar assinatura no banco de dados
export async function saveSubscription(subscription) {
  try {
    console.log('Tentando salvar subscription:', JSON.stringify(subscription));
    
    if (!subscription || !subscription.endpoint) {
      console.error('Subscription inválida:', subscription);
      return false;
    }
    
    const { endpoint, keys } = subscription;
    
    // Verificar se a tabela existe
    const { data: tableExists } = await supabase
      .from('push_subscriptions')
      .select('count')
      .limit(1)
      .catch(err => {
        console.error('Erro ao verificar tabela:', err);
        return { data: null };
      });
    
    if (tableExists === null) {
      console.error('Tabela push_subscriptions não existe ou não está acessível');
      return false;
    }
    
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          created_at: new Date().toISOString()
        },
        { onConflict: 'endpoint' }
      );
      
    if (error) {
      console.error('Erro ao salvar assinatura:', error);
      return false;
    }
    
    console.log('Assinatura salva com sucesso:', endpoint);
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
