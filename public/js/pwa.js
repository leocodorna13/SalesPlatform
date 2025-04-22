// Script para registro do Service Worker e gerenciamento de notificações

// Registra o service worker
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado com sucesso:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Falha ao registrar o Service Worker:', error);
      return null;
    }
  }
  return null;
}

// Solicita permissão para enviar notificações
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Este navegador não suporta notificações');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Função para inscrever o usuário para receber notificações push
async function subscribeToPushNotifications(registration) {
  try {
    // Chave pública do VAPID (deve ser gerada no servidor)
    // Esta é apenas uma chave de exemplo - deve ser substituída por uma chave real
    const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });
    
    console.log('Inscrição de notificação bem-sucedida:', subscription);
    
    // Aqui você enviaria a subscription para o seu servidor
    // await sendSubscriptionToServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Falha ao se inscrever para notificações push:', error);
    return null;
  }
}

// Função auxiliar para converter a chave VAPID
function urlBase64ToUint8Array(base64String) {
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

// Inicializar quando a página carregar
window.addEventListener('load', async () => {
  try {
    const registration = await registerServiceWorker();
    
    if (registration) {
      // Adicionar botão para habilitar notificações
      const notificationButton = document.getElementById('enable-notifications');
      
      if (notificationButton) {
        notificationButton.addEventListener('click', async () => {
          const permission = await requestNotificationPermission();
          
          if (permission) {
            await subscribeToPushNotifications(registration);
            notificationButton.textContent = 'Notificações ativadas!';
            notificationButton.disabled = true;
            
            // Mostrar notificação de teste
            new Notification('Notificações Ativadas', {
              body: 'Você receberá alertas quando novos produtos forem adicionados!',
              icon: '/android-chrome-192x192.png'
            });
          }
        });
        
        // Verificar status atual
        if (Notification.permission === 'granted') {
          notificationButton.textContent = 'Notificações ativadas!';
          notificationButton.disabled = true;
        }
      }
    }
  } catch (error) {
    console.error('Erro ao inicializar PWA:', error);
  }
});
